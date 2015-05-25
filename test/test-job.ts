import * as chai from "chai";
import * as sinon from "sinon";
chai.should();
chai.use(require("sinon-chai"));
chai.use(require("chai-as-promised"));

import Job from "../src/master/job";

describe("Job", () => {

  let job1: Job, job2: Job;

  beforeEach((done) => {

    let data = {
      type: 1, // JobType.Vine
      id: "123"
    };
    job1 = new Job(data, 1);
    job2 = new Job(data, 2);
    done();
  });

  it("should export priority property", (done) => {
    job1.priority.should.exist;
    job1.priority.should.equal(1);
    done();
  });

  it("should export type property", (done) => {
    job1.type.should.exist;
    job1.type.should.equal(1); // JobType.Vine
    done();
  });

  it("should export id property", (done) => {
    job1.id.should.exist;
    job1.id.should.equal("123");
    done();
  });

  it("should have function bump priority which increases priority by 1", (done) => {
    job1.bumpPriority.should.exist;
    job1.priority.should.equal(1);
    for (let i = 2; i <= 5; i++) {
      job1.bumpPriority();
      job1.priority.should.equal(i);
    }
    done();
  });

  it("should compare two jobs", (done) => {
    // Compare same jobs.
    job1.compare(job1).should.be.true;
    // Compare job with higher priority.
    job1.compare(job2).should.be.false;
    // Compare job with lower priority.
    job2.compare(job1).should.be.true;
    done();
  });

  it("should have static function to compare jobs", (done) => {
    // Compare 2 same jobs, should be equal.
    Job.CompareJobs(job1, job1).should.equal(0);
    // Compare job1 (lower) to job2 (higher), job2 should have higher prioirty.
    Job.CompareJobs(job1, job2).should.be.above(0);
    // Compare job2 (higher) to job2 (lower), job1 should have lower prioirty.
    Job.CompareJobs(job2, job1).should.be.below(0);
    done();
  });

  it("should have a static function to sort jobs", (done) => {
    Job.SortJobs.should.exist;
    let jobs: Array<Job> = [];
    // Add jobs in with priorities in ascending order.
    for (let i = 0; i <= 5; i++) {
      jobs.push(new Job(null, i));
    }
    // Sort jobs (by priority), job with [0] has highest priority.
    let sortedJobs = Job.SortJobs(jobs);
    // priority should be inversely proportional to index.
    for (let i = 0; i <= 5; i++) {
      sortedJobs[i].priority.should.equal(5 - i);
    }
    done();
  });

});
