import ArrayHelper from "../helpers/arrayHelper";
import JobTypes from "../master/JobTypes";

export class UserProfileHelper {

  /**
   * Collect User data that will be stored from API response.
   *
   * @param   {UserData}        user User data API response.
   *
   * @returns {UserProfileData}      User data with filtered fields.
   */
  public static ProcessApiResponse(userId: string, data: UserData): UserProfileData {
    return {
      type: JobTypes.User,
      username: data.username,
      id: userId,
      followerCount: UserProfileHelper.parseNum(data.followerCount),
      loopCount: UserProfileHelper.parseNum(data.followerCount),
      postCount: UserProfileHelper.parseNum(data.postCount),
      location: data.location,
      followingCount: UserProfileHelper.parseNum(data.followingCount)
    };
  }

  /**
   * Workaround to use parseInt with any value and TypeScript won't complain.
   *
   * @param   {any}    x Value to parse.
   *
   * @returns {number}   Parsed number or 0 if unable to parse.
   */
  public static parseNum(x: any): number {
    return parseInt(x, 10) || 0;
  }
}

export class VineHelper {

  /**
   * Collect Vine data that will be stored from API response.
   *
   * @param   {string}      userId Id of post author (used at sending request).
   * @param   {VideoRecord} data   Vine data API response.
   *
   * @returns {VineData}           Vine data with filtered fields.
   */
  public static ProcessApiResponse(userId: string, data: VideoRecord): VineData {
    return {
      isRepost: VineHelper.isRepost(data),
      type: JobTypes.Vine,
      id: userId,
      loopCount: UserProfileHelper.parseNum(data.loops.count),
      commentsCount: UserProfileHelper.parseNum(data.comments.count),
      tags: ArrayHelper.mergeUnique(null, data.tags, VineHelper.getTagsEntities(data.entities)),
      vineId: data.postId.toString(),
      respostsCount: UserProfileHelper.parseNum(data.reposts.count),
      likesCount: UserProfileHelper.parseNum(data.likes.count),
      created: new Date(data.created),
      mentions: VineHelper.getMentionEntities(data.entities)
    };
  }

  /**
   * Get all unique mentioned user ids from array of `VineData`.
   *
   * @param   {Array<VineData>} allData An array of `VineData`, filtered response from API.
   *
   * @returns {Array<string>}           Array of unique mentioned user ids.
   */
  public static GetUniqueMentions(allData: Array<VineData>): Array<string> {
    return allData
    // Get only array of `mentions` from `allData` array.
      .map((d: VineData) => d.mentions)
    // Flatten array of `mentions` array to a single dimension array.
      .reduce((a: Array<string>, b: Array<string>) => a.concat(b))
    // Filter out only values that have matching current index and index in array.
    // Taking advantage of fact that `.indexOf` will return first found index in array.
      .filter((e: string, i: number, arr: Array<string>) => arr.indexOf(e) === i);
  }

  /**
   * Filter out and parse entities which are of type mention.
   *
   * @param   {Array<VideoEntityRecord>} entities Array of vine entities.
   *
   * @returns {Array<string>}                     Array of mnetioned user id's.
   */
  private static getMentionEntities(entities: Array<VideoEntityRecord>): Array<string> {
    return entities
    // Filter out entites of type mention.
      .filter(entity => entity.type === "mention")
    // Expected url: vine://user-id/xxxxxxxxxxxxxxxxxx
    //  Matching the last `/xx...` part and returning just the `xx...` which is actual userid.
    //  This is used because other user ids aren't pointing to correct records.
      .map(entity => entity.link.match(/\/(\d+)$/)[1], 10);
  }

  /**
  * Filter out and parse entities which are of type tag.
   *
   * @param   {Array<VideoEntityRecord>} entities Array of vine entities.
   *
   * @returns {Array<string>}                     Array of mnetioned user id's.
   */
  private static getTagsEntities(entities: Array<VideoEntityRecord>): Array<string> {
    return entities
    // Filter out entites of type tag.
      .filter(entity => entity.type === "tag")
    // Pick out titles of entities.
      .map(entity => entity.title);
  }

  /**
   * Check if Vine is a repost.
   *
   * @param   {VideoRecord} data API response for a Vine.
   *
   * @returns {boolean}          True if Vine is a repost, false otherwise.
   */
  private static isRepost(data: VideoRecord): boolean {
    return !!data.repost;
  }
}
