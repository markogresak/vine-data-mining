interface StoredData {
  /**
   * Type of data record.
   * @type {JobType}
   */
  type: JobType;
  /**
   * Unique indentifier.
   * @type {string}
   */
  id: string;
  /**
   * Flag set to true if vine is a repost.
   * @type {boolean}
   */
  repost?: boolean;
  /**
   * An array of mentioned userids.
   * @type {Array<string>}
   */
  mentions?: Array<string>;
}
/**
 * Data collected from user's profile.
 */
interface UserProfileData extends StoredData {
  /**
   * User's username.
   * @type {string}
   */
  username: string;
  /**
   * Number of user's followers.
   * @type {number}
   */
  followerCount: number;
  /**
   * Sum of all posted vines loops.
   * @type {number}
   */
  loopCount: number;
  /**
   * Number of all posts (including reposts).
   * @type {number}
   */
  postCount: number;
  /**
   * Number of original (uploaded) posts.
   * @type {number}
   */
  authoredPostCount: number;
  /**
   * Location user has entered. It's probably not very reliable.
   * @type {string}
   */
  location: string;
  /**
   * Number of users this user is following.
   * @type {number}
   */
  followingCount: number;
}

/**
 * Data collected from a vine upload.
 */
interface VineData extends StoredData {
  /**
   * User id of vine author.
   * @type {number}
   */
  vineId: string;
  /**
   * Number of times this vine was looped.
   * @type {number}
   */
  loopCount: number;
  /**
   * Number of comments for this vine.
   * @type {number}
   */
  commentsCount: number;
  /**
   * Tags for this vine. (most likely an empty array)
   * @type {Array<string>}
   */
  tags: Array<string>;
  /**
   * Number of times this vine was reposted.
   * @type {number}
   */
  repostsCount: number;
  /**
   * Number of times this vine was liked.
   * @type {number}
   */
  likesCount: number;
  /**
   * Date when this vine was uploaded.
   * @type {Date}
   */
  created: Date;
}
