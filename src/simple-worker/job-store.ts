import VineApi from "../api/VineApi";
import Job from "../master/job";
import JobTypes from "../master/JobTypes";
let Orchestrate = require("orchestrate");

export default class JobStore {

  /**
   * Vine API connector utility.
   *
   * @type {VineApi}
   */
  private vineApi: VineApi;

  /**
   * Orchestrate API connector utility.
   *
   * @type {any}
   */
  private orchestrateDb;

  /**
   * Array of pending jobs.
   *
   * @type {Array<Job>}
   */
  private jobs: Array<Job>;

  /**
   * Array of uids of completed jobs.
   *
   * @type {Array<string>}
   */
  private doneJobs: Array<string>;

  /**
   * Initialize a new JobStore.
   */
  constructor() {
    // Check if ORCHESTRATE_KEY environment variable is set.
    if (!process.env.ORCHESTRATE_KEY) {
      throw Error("Missing environment variable ORCHESTRATE_KEY.");
    }
    // Initialize API connectors.
    this.orchestrateDb = Orchestrate(process.env.ORCHESTRATE_KEY);
    this.vineApi = new VineApi();
    // Initialize arrays.
    this.doneJobs = [];
    this.jobs = [];
  }

  /**
   * Get next job from list of jobs.
   *
   * NOTE: Get next job from the list ([0] is used because splice always returns an array).
   *
   * @returns {Job}
   */
  get next(): Job { return this.jobs.splice(0, 1)[0] }

  /**
   * Get API data based on job type.
   *
   * @param   {Job}          job Job to get data for.
   *
   * @returns {Promise<any>}     Promise resolving to either UserProfileData or an Array<VineData>.
   */
  public fetchVineData(job: Job): Promise<any> {
    // If job is of unknown type, resolve promise with null.
    if (!JobTypes.isJobType(job.type)) {
      return Promise.resolve(null);
    }
    return job.type === JobTypes.User ? this.vineApi.getUserProfile(job.id) : this.vineApi.getUserTimeline(job.id);
  }
}