import * as express from "express";
import {expressInit} from "../helpers/expressInit";
import VineApi from "../api/VineApi";
import Job from "./job";
import {JobTypes} from "../api/ApiHelpers";
import Communicator from "../helpers/communicator";
let Orchestrate = require("orchestrate");
let CanIHazIp = require("canihazip");

class MasterNode {

  /**
   * Id's of 5 most followed users (my assuption).
   *
   * @type {Array<string>}
   */
  private static INITIAL_USERS = [
    "934940633704046592", // KingBach
    "935302706900402176", // Nash Grier
    "912665006900916224", // Brittany Furlan
    "912482556656623616", // Rudy Mancuso
    "925163818496167936"  // Curtis Lepore
  ];

  /**
   * Name of Orchestrate database collection.
   *
   * @type {String}
   */
  private static ORCHESTRATE_COLLECTION = "vine";

  /**
   * Address of router server.
   *
   * @type {String}
   */
  private static ROUTER_SERVER = "https://gresak.io:9631";

  /**
   * Endpoint of router.
   *
   * @type {String}
   */
  private static ROUTER_ENDPOINT = "router";

  /**
   * Timeout before job resets (5min).
   *
   * @type {number}
   */
  private static JOB_TIMEOUT = 5 * 60 * 1000;

  /**
   * Orchestrate database connector.
   *
   * @type {any}
   */
  private orchestrateDb: any;

  /**
   * Array of currently pending jobs.
   *
   * @type {Array<Job>}
   */
  private jobs: Array<Job>;

  private jobTimeouts: Object;

  constructor(port: number) {
    // Check if ORCHESTRATE_KEY environment variable is set.
    if (!process.env.ORCHESTRATE_KEY) {
      throw Error("Missing environment variable ORCHESTRATE_KEY.");
    }
    // Initialize orchestrate database connector.
    this.orchestrateDb = Orchestrate(process.env.ORCHESTRATE_KEY);
    // Map initial users to user jobs.
    this.jobs = [];
    MasterNode.INITIAL_USERS.forEach((id) => {
      // For each id add both user and vine jobs.
      this.jobs.push(
        new Job({ type: JobTypes.User, id: id }),
        new Job({ type: JobTypes.Vine, id: id })
        );
    });
    this.jobTimeouts = {};
    expressInit(port, "/master", this.setupExpressRouter, this);
    this.registerIpAtRouter();
  }

  /**
   * Set up an expres API router.
   *
   * @returns {express.Router} Configured express router.
   */
  private setupExpressRouter(): express.Router {
    let router = express.Router();
    // GET /job, returns a list of jobs with most priority.
    router.get("/job", (req, res) => {
      this.logRequest(req);
      res.json(this.getNextJobs());
    });
    // PUT /job, complete jobs with data.
    router.put("/job", (req, res) => {
      this.logRequest(req);
      this.completeJobs(req.body.data);
    });
    return router;
  }

  /**
   * Logs remote address and data, if put request.
   *
   * @param   {any}  req  Express request object, used to log client IP and received data.
   */
  private logRequest(req: any): void {
    console.log("-----------------------------------------------------");
    console.log(`${req.method} request from`, (req.headers["x-forwarded-for"] || req.connection.remoteAddress));
    // If it was PUT request, log received data.
    if (req.method === "PUT") {
      console.log(req.body.data);
    }
  }

  /**
   * Add a job to list of jobs.
   *
   * @param   {StoredData} data Job data.
   */
  private addJob(data: StoredData): void {
    this.jobs.push(new Job(data));
    this.jobs = Job.Sort(this.jobs);
  }

  /**
   * Get next `count` jobs with highest priority.
   *
   * @param   {number = 5} count How many jobs take.
   *
   * @returns {Array<Job>}       Array of jobs.
   */
  private getNextJobs(count: number = 1): Array<Job> {
    // Filter jobs to keep only idle, then take first `count` jobs.
    // Assuming that jobs are already sorted, this is `count` most important jobs.
    return Job.FilterIdle(this.jobs).slice(0, count).map((job) => {
      job.markActive();
      this.jobTimeouts[job.uid] = setTimeout(() => job.resetState());
      // Return job to add it to mapped jobs.
      return job;
    });
  }

  /**
   * Take an array of completed jobs and remove them from stored jobs.
   *
   * @param {Array<Job>} completeJobs Jobs to be marked complete / removed.
   */
  private completeJobs(jobs: Array<Job>): Promise<any> {
    return new Promise((resolve, reject) => {
      // Attempt to store jobs data.
      this.storeJobData(jobs).then(() => {
        // Filter `this.jobs` to keep values which are not found in `jobs` array and then resolve the promise.
        this.jobs = this.jobs.filter((tj: Job) => !jobs.some((j: Job) => j.equals(tj)));
        resolve();
      })
      // Reject returned promise if storeJobData failed.
        .catch(reject);
    });
  }

  /**
   * For each job, make query to database to see if it already exist.
   *
   * @param   {Array<Job>}      jobs              Jobs to search for.
   * @param   {boolean = false} resolveWithFound  Should resolve promise with found jobs?
   *
   * @returns {PromiseArray<boolean>}             Promise resolving to an array of job existance boolean flags,
   *                                                      true: exists, false: does not exist.
   */
  private findExisitngData(jobs: Array<Job>, resolveWithFound: boolean = false): Promise<Array<boolean>> {
    return new Promise((resolve, reject) => {
      // Initialize array of found jobs to all false, with length of `jobs`.
      let jobsToKeep: Array<boolean> = jobs.map(() => resolveWithFound);
      let jobQueryPromises: Array<Promise<any>> = jobs.map((job, i) => {
        // Return the promise mapped into `jobQueryPromises`.
        return this.orchestrateDb.newSearchBuilder().collection(MasterNode.ORCHESTRATE_COLLECTION).query(job.id)
          .then((data) => {
          // For each job, make a query to Orchestrate and if found data length
          // is greater than 0, set flag to `resolveWithFound` (inverse).
          if (data.length > 0) {
            jobsToKeep[i] = !resolveWithFound;
          }
        });
      });
      // When all Orchestrate promises resolve, resolve returned promise based on
      // `resolveWithFound` argument, it's kept if `jobsToKeep` value is `true`.
      Promise.all(jobQueryPromises).then(() => resolve(jobsToKeep));
    });
  }

  /**
   * Store job data to Orchestrate.
   *
   * @param   {Array<Job>}   jobs Jobs to be stored.
   *
   * @returns {Promise<any>}      Promise which resolves when data is stored or is rejected if storing fails.
   */
  private storeJobData(jobs: Array<Job>): Promise<any> {
    return new Promise((resolve, reject) => {
      // Map `jobs` to promises which resolve when put request successfully ends.
      let dbPromises = jobs.map((j: Job) => this.orchestrateDb.put(MasterNode.ORCHESTRATE_COLLECTION, j.data.id, j.data));
      // Resolve returned promise when all `dbPromises` resolve or reject it if any of them fails.
      Promise.all(dbPromises).then(resolve).catch(reject);
    });
  }

  /**
   * Register IP of node with router.
   *
   * @returns {Promise<any>} Promise resolving when IP is registed successfully.
   */
  private registerIpAtRouter(): Promise<any> {
    return new Promise((resolve, reject) => {
      // Get IP of this machine.
      CanIHazIp().then((ip: string) => {
        // Register `ip` with router.
        Communicator.registerAddress(MasterNode.ROUTER_SERVER, MasterNode.ROUTER_ENDPOINT, ip)
          .then(() => {
          // Add exit listeners and resolve returned promise.
          this.addExitListeners();
          resolve();
        })
        // If there was error while registering the address, reject returned promise.
          .catch(reject);
      });
    });
  }

  /**
   * Listen for exit events and unregister IP at router just before master node process exits.
   */
  private addExitListeners(): void {
    // Register event for each of exit/kill events.
    ["exit", "SIGINT", "uncaughtException"].forEach((event) => {
      // Event handler should remove IP registered with router.
      process.on(event, () => Communicator.unregisterAddress(MasterNode.ROUTER_SERVER, MasterNode.ROUTER_ENDPOINT));
    });
  }
}

new MasterNode(9999);
