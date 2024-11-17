// definition of all typescript interfaces and types here as specified by openAPI spec

/* eslint-disable */
/* tslint:disable */
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

export interface Package {
  /**
   * The "Name" and "Version" are used as a unique identifier pair when uploading a package.
   *
   * The "ID" is used as an internal identifier for interacting with existing packages.
   */
  metadata: PackageMetadata;
  /**
   * This is a "union" type.
   * - On package upload, either Content or URL should be set. If both are set, returns 400.
   * - On package update, exactly one field should be set.
   * - On download, the Content field should be set.
   */
  data: PackageData;
}

/**
 * The "Name" and "Version" are used as a unique identifier pair when uploading a package.
 *
 * The "ID" is used as an internal identifier for interacting with existing packages.
 */
export interface PackageMetadata {
  /**
   * Name of a package.
   *
   * - Names should only use typical "keyboard" characters.
   * - The name "*" is reserved. See the `/packages` API for its meaning.
   */
  Name: PackageName;
  /**
   * Package version
   * @example "1.2.3"
   */
  Version: string;
  /** Unique ID for use with the /package/{id} endpoint. */
  ID: PackageID;
}

/**
 * This is a "union" type.
 * - On package upload, either Content or URL should be set. If both are set, returns 400.
 * - On package update, exactly one field should be set.
 * - On download, the Content field should be set.
 */
export interface PackageData {
  /**
   * Package contents. This is the zip file uploaded by the user. (Encoded as text using a Base64 encoding).
   *
   * This will be a zipped version of an npm package's GitHub repository, minus the ".git/" directory." It will, for example, include the "package.json" file that can be used to retrieve the project homepage.
   *
   * See https://docs.npmjs.com/cli/v7/configuring-npm/package-json#homepage.
   */
  Content?: string;
  /** Package URL (for use in public ingest). */
  URL?: string;
  /** If true, remove uneccessary bloat from the package. You may wish to read about tree shaking, minification, etc */
  debloat?: boolean;
  /** A JavaScript program (for use with sensitive modules). */
  JSProgram?: string;
}

export interface User {
  /** @example "Alfalfa" */
  name: string;
  /** Is this user an admin? */
  isAdmin: boolean;
}

/** Authentication info for a user */
export interface UserAuthenticationInfo {
  /** Password for a user. Per the spec, this should be a "strong" password. */
  password: string;
}

/**
 * Unique ID for use with the /package/{id} endpoint.
 * @pattern ^[a-zA-Z0-9\-]+$
 * @example "123567192081501"
 */
export type PackageID = string;

/** Package Cost is the collection of total cost of package given in terms of total Megabytes (mb) that needs to be downloaded. It consists of a map with key of the map as the package ID and it's value consists of total cost as describe below. */
export type PackageCost = Record<
  string,
  {
    /** The stand alone cost of this package excluding dependencies. This field is only required in case `dependency = true`, in the request. */
    standaloneCost?: number;
    /**
     * The total cost of the package. When `dependency` is not set, this should return the standalone cost,
     * and when it is set, this field should return the sum of the costs of all the dependencies.
     *
     * For example:
     *
     *   Package 1 -> Package 2 -> Package 3, Package 4.
     *
     *     If dependency = false
     *       totalCost = (Package 1).size()
     *     If dependency = true
     *     totalCost = (Package 1 + Package 2 + Package 3 + Package 4).size()
     */
    totalCost: number;
  }
>;

/**
 * Package rating (cf. Project 1).
 *
 * If the Project 1 that you inherited does not support one or more of the original properties, denote this with the value "-1".
 */
export interface PackageRating {
  /** @format double */
  BusFactor: number;
  /** @format double */
  BusFactorLatency: number;
  /** @format double */
  Correctness: number;
  /** @format double */
  CorrectnessLatency: number;
  /** @format double */
  RampUp: number;
  /** @format double */
  RampUpLatency: number;
  /** @format double */
  ResponsiveMaintainer: number;
  /** @format double */
  ResponsiveMaintainerLatency: number;
  /** @format double */
  LicenseScore: number;
  /** @format double */
  LicenseScoreLatency: number;
  /**
   * The fraction of its dependencies that are pinned to at least a specific major+minor version, e.g. version 2.3.X of a package. (If there are zero dependencies, they should receive a 1.0 rating. If there are two dependencies, one pinned to this degree, then they should receive a Â½ = 0.5 rating).
   * @format double
   */
  GoodPinningPractice: number;
  /** @format double */
  GoodPinningPracticeLatency: number;
  /**
   * The fraction of project code that was introduced through pull requests with a code review.
   * @format double
   */
  PullRequest: number;
  /**
   * The fraction of project code that was introduced through pull requests with a code review.
   * @format double
   */
  PullRequestLatency: number;
  /**
   * Scores calculated from other seven metrics.
   * @format double
   */
  NetScore: number;
  /**
   * Scores calculated from other seven metrics.
   * @format double
   */
  NetScoreLatency: number;
}

/** One entry of the history of this package. */
export interface PackageHistoryEntry {
  User: User;
  /**
   * Date of activity using ISO-8601 Datetime standard in UTC format.
   * @format date-time
   * @example "2023-03-23T23:11:15.000Z"
   */
  Date: string;
  /**
   * The "Name" and "Version" are used as a unique identifier pair when uploading a package.
   *
   * The "ID" is used as an internal identifier for interacting with existing packages.
   */
  PackageMetadata: PackageMetadata;
  Action: "CREATE" | "UPDATE" | "DOWNLOAD" | "RATE";
}

/**
 * Name of a package.
 *
 * - Names should only use typical "keyboard" characters.
 * - The name "*" is reserved. See the `/packages` API for its meaning.
 */
export type PackageName = string;

/** The spec permits you to use any token format you like. You could, for example, look into JSON Web Tokens ("JWT", pronounced "jots"): https://jwt.io. */
export type AuthenticationToken = string;

export interface AuthenticationRequest {
  User: User;
  /** Authentication info for a user */
  Secret: UserAuthenticationInfo;
}

/**
 * @example "Exact (1.2.3)
 * Bounded range (1.2.3-2.1.0)
 * Carat (^1.2.3)
 * Tilde (~1.2.0)"
 */
export type SemverRange = string;

export interface PackageQuery {
  Version?: SemverRange;
  /**
   * Name of a package.
   *
   * - Names should only use typical "keyboard" characters.
   * - The name "*" is reserved. See the `/packages` API for its meaning.
   */
  Name: PackageName;
}

/**
 * Offset in pagination.
 * @example "1"
 */
export type EnumerateOffset = string;

export interface PackageRegEx {
  /** A regular expression over package names and READMEs that is used for searching for a package */
  RegEx: string;
}

export type QueryParamsType = Record<string | number, any>;
export type ResponseFormat = keyof Omit<Body, "body" | "bodyUsed">;

export interface FullRequestParams extends Omit<RequestInit, "body"> {
  /** set parameter to `true` for call `securityWorker` for this request */
  secure?: boolean;
  /** request path */
  path: string;
  /** content type of request body */
  type?: ContentType;
  /** query params */
  query?: QueryParamsType;
  /** format of response (i.e. response.json() -> format: "json") */
  format?: ResponseFormat;
  /** request body */
  body?: unknown;
  /** base url */
  baseUrl?: string;
  /** request cancellation token */
  cancelToken?: CancelToken;
}

export type RequestParams = Omit<
  FullRequestParams,
  "body" | "method" | "query" | "path"
>;

export interface ApiConfig<SecurityDataType = unknown> {
  baseUrl?: string;
  baseApiParams?: Omit<RequestParams, "baseUrl" | "cancelToken" | "signal">;
  securityWorker?: (
    securityData: SecurityDataType | null,
  ) => Promise<RequestParams | void> | RequestParams | void;
  customFetch?: typeof fetch;
}

export interface HttpResponse<D extends unknown, E extends unknown = unknown>
  extends Response {
  data: D;
  error: E;
}

type CancelToken = Symbol | string | number;

export enum ContentType {
  Json = "application/json",
  FormData = "multipart/form-data",
  UrlEncoded = "application/x-www-form-urlencoded",
  Text = "text/plain",
}

export class HttpClient<SecurityDataType = unknown> {
  public baseUrl: string = "";
  private securityData: SecurityDataType | null = null;
  private securityWorker?: ApiConfig<SecurityDataType>["securityWorker"];
  private abortControllers = new Map<CancelToken, AbortController>();
  private customFetch = (...fetchParams: Parameters<typeof fetch>) =>
    fetch(...fetchParams);

  private baseApiParams: RequestParams = {
    credentials: "same-origin",
    headers: {},
    redirect: "follow",
    referrerPolicy: "no-referrer",
  };

  constructor(apiConfig: ApiConfig<SecurityDataType> = {}) {
    Object.assign(this, apiConfig);
  }

  public setSecurityData = (data: SecurityDataType | null) => {
    this.securityData = data;
  };

  protected encodeQueryParam(key: string, value: any) {
    const encodedKey = encodeURIComponent(key);
    return `${encodedKey}=${encodeURIComponent(typeof value === "number" ? value : `${value}`)}`;
  }

  protected addQueryParam(query: QueryParamsType, key: string) {
    return this.encodeQueryParam(key, query[key]);
  }

  protected addArrayQueryParam(query: QueryParamsType, key: string) {
    const value = query[key];
    return value.map((v: any) => this.encodeQueryParam(key, v)).join("&");
  }

  protected toQueryString(rawQuery?: QueryParamsType): string {
    const query = rawQuery || {};
    const keys = Object.keys(query).filter(
      (key) => "undefined" !== typeof query[key],
    );
    return keys
      .map((key) =>
        Array.isArray(query[key])
          ? this.addArrayQueryParam(query, key)
          : this.addQueryParam(query, key),
      )
      .join("&");
  }

  protected addQueryParams(rawQuery?: QueryParamsType): string {
    const queryString = this.toQueryString(rawQuery);
    return queryString ? `?${queryString}` : "";
  }

  private contentFormatters: Record<ContentType, (input: any) => any> = {
    [ContentType.Json]: (input: any) =>
      input !== null && (typeof input === "object" || typeof input === "string")
        ? JSON.stringify(input)
        : input,
    [ContentType.Text]: (input: any) =>
      input !== null && typeof input !== "string"
        ? JSON.stringify(input)
        : input,
    [ContentType.FormData]: (input: any) =>
      Object.keys(input || {}).reduce((formData, key) => {
        const property = input[key];
        formData.append(
          key,
          property instanceof Blob
            ? property
            : typeof property === "object" && property !== null
              ? JSON.stringify(property)
              : `${property}`,
        );
        return formData;
      }, new FormData()),
    [ContentType.UrlEncoded]: (input: any) => this.toQueryString(input),
  };

  protected mergeRequestParams(
    params1: RequestParams,
    params2?: RequestParams,
  ): RequestParams {
    return {
      ...this.baseApiParams,
      ...params1,
      ...(params2 || {}),
      headers: {
        ...(this.baseApiParams.headers || {}),
        ...(params1.headers || {}),
        ...((params2 && params2.headers) || {}),
      },
    };
  }

  protected createAbortSignal = (
    cancelToken: CancelToken,
  ): AbortSignal | undefined => {
    if (this.abortControllers.has(cancelToken)) {
      const abortController = this.abortControllers.get(cancelToken);
      if (abortController) {
        return abortController.signal;
      }
      return void 0;
    }

    const abortController = new AbortController();
    this.abortControllers.set(cancelToken, abortController);
    return abortController.signal;
  };

  public abortRequest = (cancelToken: CancelToken) => {
    const abortController = this.abortControllers.get(cancelToken);

    if (abortController) {
      abortController.abort();
      this.abortControllers.delete(cancelToken);
    }
  };

  public request = async <T = any, E = any>({
    body,
    secure,
    path,
    type,
    query,
    format,
    baseUrl,
    cancelToken,
    ...params
  }: FullRequestParams): Promise<HttpResponse<T, E>> => {
    const secureParams =
      ((typeof secure === "boolean" ? secure : this.baseApiParams.secure) &&
        this.securityWorker &&
        (await this.securityWorker(this.securityData))) ||
      {};
    const requestParams = this.mergeRequestParams(params, secureParams);
    const queryString = query && this.toQueryString(query);
    const payloadFormatter = this.contentFormatters[type || ContentType.Json];
    const responseFormat = format || requestParams.format;

    return this.customFetch(
      `${baseUrl || this.baseUrl || ""}${path}${queryString ? `?${queryString}` : ""}`,
      {
        ...requestParams,
        headers: {
          ...(requestParams.headers || {}),
          ...(type && type !== ContentType.FormData
            ? { "Content-Type": type }
            : {}),
        },
        signal:
          (cancelToken
            ? this.createAbortSignal(cancelToken)
            : requestParams.signal) || null,
        body:
          typeof body === "undefined" || body === null
            ? null
            : payloadFormatter(body),
      },
    ).then(async (response) => {
      const r = response.clone() as HttpResponse<T, E>;
      r.data = null as unknown as T;
      r.error = null as unknown as E;

      const data = !responseFormat
        ? r
        : await response[responseFormat]()
            .then((data) => {
              if (r.ok) {
                r.data = data;
              } else {
                r.error = data;
              }
              return r;
            })
            .catch((e) => {
              r.error = e;
              return r;
            });

      if (cancelToken) {
        this.abortControllers.delete(cancelToken);
      }

      if (!response.ok) throw data;
      return data;
    });
  };
}

/**
 * @title ECE 461 - Fall 2024 - Project Phase 2
 * @version 2.4.1
 * @license Apache 2.0 (https://www.apache.org/licenses/LICENSE-2.0.html)
 * @termsOfService http://swagger.io/terms/
 * @contact Prof. Davis <davisjam@purdue.edu> (http://davisjam.github.io)
 *
 * API for ECE 461/Fall 2024/Project Phase 2: A Trustworthy Module Registry"
 *
 * All endpoints have BASELINE or NON-BASELINE listed. Please read through all descriptions before raising questions.
 *
 * A package ID is unique identifier for Package and Version. (Key idea -> id is unique for all pacakges).
 *
 * Eg.
 *
 *     PacakgeName: Alpha, PackageVersion: 1.1.1 -> PackageID: 988645763
 *
 *     PacakgeName: Alpha, PackageVersion: 1.3.2 -> PackageID: 357898765
 */
export class Api<
  SecurityDataType extends unknown,
> extends HttpClient<SecurityDataType> {
  packages = {
    /**
     * @description Get any packages fitting the query. Search for packages satisfying the indicated query. If you want to enumerate all packages, provide an array with a single PackageQuery whose name is "*". The response is paginated; the response header includes the offset to use in the next query. In the Request Body below, "Version" has all the possible inputs. The "Version" cannot be a combinaiton of the different possibilities.
     *
     * @name PackagesList
     * @summary Get the packages from the registry. (BASELINE)
     * @request POST:/packages
     */
    packagesList: (
      data: PackageQuery[],
      query?: {
        /** Provide this for pagination. If not provided, returns the first page of results. */
        offset?: EnumerateOffset;
      },
      params: RequestParams = {},
    ) =>
      this.request<PackageMetadata[], void>({
        path: `/packages`,
        method: "POST",
        query: query,
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),
  };
  reset = {
    /**
     * @description Reset the registry to a system default state.
     *
     * @name RegistryReset
     * @summary Reset the registry. (BASELINE)
     * @request DELETE:/reset
     */
    registryReset: (params: RequestParams = {}) =>
      this.request<void, void>({
        path: `/reset`,
        method: "DELETE",
        ...params,
      }),
  };
  package = {
    /**
     * @description Return this package.
     *
     * @name PackageRetrieve
     * @summary Interact with the package with this ID. (BASELINE)
     * @request GET:/package/{id}
     */
    packageRetrieve: (id: PackageID, params: RequestParams = {}) =>
      this.request<Package, void>({
        path: `/package/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description The name, version, and ID must match. The package contents (from PackageData) will replace the previous contents.
     *
     * @name PackageUpdate
     * @summary Update this content of the package. (BASELINE)
     * @request PUT:/package/{id}
     */
    packageUpdate: (id: PackageID, data: Package, params: RequestParams = {}) =>
      this.request<void, void>({
        path: `/package/${id}`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * @description Delete only the package that matches "id". (id is a unique identifier for a packge)
     *
     * @name PackageDelete
     * @summary Delete this version of the package. (NON-BASELINE)
     * @request DELETE:/package/{id}
     */
    packageDelete: (id: PackageID, id: PackageID, params: RequestParams = {}) =>
      this.request<void, void>({
        path: `/package/${id}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * @description Upload or Ingest a new package. Packages that are uploaded may have the same name but a new version. Refer to the description above to see how an id is formed for a pacakge.
     *
     * @name PackageCreate
     * @summary Upload or Ingest a new package. (BASELINE)
     * @request POST:/package
     */
    packageCreate: (data: PackageData, params: RequestParams = {}) =>
      this.request<Package, void>({
        path: `/package`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @name PackageRate
     * @summary Get ratings for this package. (BASELINE)
     * @request GET:/package/{id}/rate
     */
    packageRate: (id: PackageID, params: RequestParams = {}) =>
      this.request<PackageRating, void>({
        path: `/package/${id}/rate`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @name CostDetail
     * @summary Get the cost of a package (BASELINE)
     * @request GET:/package/{id}/cost
     */
    costDetail: (
      id: PackageID,
      query?: {
        /** @default false */
        dependency?: boolean;
      },
      params: RequestParams = {},
    ) =>
      this.request<PackageCost, void>({
        path: `/package/${id}/cost`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * @description Return the history of this package (all versions).
     *
     * @name PackageByNameGet
     * @summary (NON-BASELINE)
     * @request GET:/package/byName/{name}
     */
    packageByNameGet: (name: PackageName, params: RequestParams = {}) =>
      this.request<PackageHistoryEntry[], void>({
        path: `/package/byName/${name}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description Search for a package using regular expression over package names and READMEs. This is similar to search by name.
     *
     * @name PackageByRegExGet
     * @summary Get any packages fitting the regular expression (BASELINE).
     * @request POST:/package/byRegEx
     */
    packageByRegExGet: (data: PackageRegEx, params: RequestParams = {}) =>
      this.request<PackageMetadata[], void>({
        path: `/package/byRegEx`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),
  };
  authenticate = {
    /**
     * No description
     *
     * @name SummaryAuthenticate
     * @request SUMMARY:/authenticate
     */
    summaryAuthenticate: (params: RequestParams = {}) =>
      this.request<any, any>({
        path: `/authenticate`,
        method: "SUMMARY",
        ...params,
      }),

    /**
     * No description
     *
     * @name DescriptionAuthenticate
     * @request DESCRIPTION:/authenticate
     */
    descriptionAuthenticate: (params: RequestParams = {}) =>
      this.request<any, any>({
        path: `/authenticate`,
        method: "DESCRIPTION",
        ...params,
      }),

    /**
     * @description Create an access token.
     *
     * @name CreateAuthToken
     * @summary (NON-BASELINE)
     * @request PUT:/authenticate
     */
    createAuthToken: (
      data: AuthenticationRequest,
      params: RequestParams = {},
    ) =>
      this.request<AuthenticationToken, void>({
        path: `/authenticate`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),
  };
  tracks = {
    /**
     * No description
     *
     * @name TracksList
     * @summary Get the list of tracks a student has planned to implement in their code
     * @request GET:/tracks
     */
    tracksList: (params: RequestParams = {}) =>
      this.request<
        {
          /** List of tracks the student plans to implement */
          plannedTracks?: (
            | "Performance track"
            | "Access control track"
            | "High assurance track"
            | "ML inside track"
          )[];
        },
        void
      >({
        path: `/tracks`,
        method: "GET",
        format: "json",
        ...params,
      }),
  };
}
