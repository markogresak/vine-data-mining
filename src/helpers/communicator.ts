import {Promise} from "es6-promise";
import * as request from "request";

export default class Communicator {

  /**
   * Address of router server.
   *
   * @type {String}
   */
  private static ROUTER_SERVER = "https://gresak.io:9998";

  /**
   * Endpoint of router.
   *
   * @type {String}
   */
  private static ROUTER_ENDPOINT = "router";

  /**
   * Ping a server each `interval`ms until `check` returns true.
   *
   * @param   {string}                    address  Address to ping.
   * @param   {string}                    endpoint Address endpoint to ping (starting / is not needed).
   * @param   {number}                    interval Interval in ms to ping the server.
   * @param   {(string, any?) => boolean} accept   Function which returns true when result is as expected.
   * @param   {boolean = false}      rejectOnError Should the promise be rejected if request to server fails?
   *
   * @returns {Promise<any>}                     Promise which is resolved when `check` returns true.
   */
  public static ping(
    address: string, endpoint: string,
    interval: number, accept: (body: string, res?: any) => boolean,
    thisArg: any = this, rejectOnError: boolean = false): Promise<any> {
    return new Promise((resolve, reject) => {
      // Set interval to ping server. Store in variable so it can be cleaned before resolving.
      let checkInterval = setInterval(() => {
        // Send a get request to address/endpoint and
        request.get({ url: `${address}/${endpoint}` },
          (err, httpResponse, body: string) => {
            if (rejectOnError) {
              Communicator.checkErrorAndReject(err, httpResponse, body, reject);
            }
            if (accept.call(thisArg, body, httpResponse)) {
              clearInterval(checkInterval);
              resolve(body);
            }
          });
      }, interval);
    });
  }

  /**
   * Register an ipAddress on router.
   *
   * @param   {string}       ipAddress IP address to be registered.
   * @param   {string}       server    Server address where router is running.
   * @param   {string}       endpoint  Server endpoint where router is listening.
   *
   * @returns {Promise<string>}        Promise which will be resolved when ipAddress is successfully registered.
   *                                           Resolves with body of last request.
   */
  public static registerAddress(
    ipAddress: string,
    server: string = Communicator.ROUTER_SERVER,
    endpoint: string = Communicator.ROUTER_ENDPOINT): Promise<string> {
    return new Promise((resolve, reject) => {
      // Send a put request with value of `ipAddress` to `server`/`endpoint`.
      console.log("Register address: PUT", `${server}/${endpoint}`);
      request.put({
        url: `${server}/${endpoint}/${ipAddress}`,
        form: { address: ipAddress }
      },
        (err, httpResponse, body: string) => {
          // Check for errors, calls reject if there are any.
          Communicator.checkErrorAndReject(err, httpResponse, body, reject);
          // Register was successful, resolve returned promise.
          resolve(body);
        });
    });
  }

  /**
   * Unregister an address froum router.
   *
   * @param   {string}       server    Server address where router is running.
   * @param   {string}       endpoint  Server endpoint where router is listening.
   */
  public static unregisterAddress(
    server: string = Communicator.ROUTER_SERVER,
    endpoint: string = Communicator.ROUTER_ENDPOINT): void {
    // Send a DELETE request to `server`/`endpoint`.
    // Don't wait for a response so this function (and it's process) can exit as quickly as possible.
    request.del({ url: `${server}/${endpoint}` });
  }

  /**
   * Get an address registered on router. Promise will not be resolved until an IP is registered.
   *
   * @param   {string}       server    Server address where router is running.
   * @param   {string}       endpoint  Server endpoint where router is listening.
   *
   * @returns {Promise<string>}        Promise resolving with IP registered at router.
   */
  public static getAddress(
    server: string = Communicator.ROUTER_SERVER,
    endpoint: string = Communicator.ROUTER_ENDPOINT): Promise<string> {
    return new Promise((resolve, reject) => {
      // Ping router each second.
      Communicator.ping(server, endpoint, 1000, (body: string) => {
        // Accept function checks if registered address should return true when registered address isn't null.
        try {
          return JSON.parse(body).address !== null;
        }
        catch (e) {
          // Also return false if there was an error while parsing body to JSON.
          return false;
        }
      })
        .then((body: string) => {
        // When address is accepted, ping promise will be resolved with last body it got.
        // Parse the body again and resolve returned promise with address value.
        resolve(JSON.parse(body).address);
      });
    });
  }

  /**
   * Check for errors in request response and call reject function if any errors found.
   *
   * @param {any}             err          Error from `request`.
   * @param {any}             httpResponse Response data from `request`.
   * @param {any}             body         Body from `request` response.
   * @param {(any) => any}    reject       Function which is called if there was an error in response.
   * @param {boolean = true}  checkStatus  Should status code be checked?
   */
  public static checkErrorAndReject(err: any, httpResponse: any, body: any, reject: (any) => any, checkStatus: boolean = true): void {
    // Check for error in request and call reject function.
    // Return is used so function stops, value is not expected to be used.
    if (err) {
      return reject(err);
    }
    // If checkStatus flag is true, check if response code is equal to or above 400, call reject if both is true.
    // Return is used so function stops, value is not expected to be used.
    if (checkStatus && httpResponse.statusCode >= 400) {
      return reject(Error(`Server responded with status code ${httpResponse.statusCode}:\n${body}`));
    }
  }

}
