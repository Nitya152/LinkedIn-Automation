import { sanitizeBaseUrl, extractLinkedInSlug } from "./unipile";
import { AutomationConfig, AutomationResponse, AutomationStepLog, PostItem, ProfileInfo } from "@/types";

export function getUnipileErrorMessage(data: any, res?: Response): string {
  if (data?.title) {
    if (data.title === "No client session" || data?.type === "errors/no_client_session") {
      return "No active client session (HTTP 503): Your LinkedIn account session is disconnected or expired on the Unipile dashboard. Please reconnect your account on dashboard.unipile.com.";
    }
    if (data.title === "Invalid credentials" || data?.type === "errors/invalid_credentials") {
      return "Invalid API credentials (HTTP 401): Please verify your Unipile API Key.";
    }
    return `${data.title}${data?.message ? `: ${data.message}` : ""}`;
  }
  return data?.message || data?.error || (res ? `HTTP ${res.status} ${res.statusText}` : "Request failed");
}

export async function executeAutomation(config: AutomationConfig): Promise<AutomationResponse> {
  const logs: AutomationStepLog[] = [];
  let resolvedProfile: ProfileInfo | null = null;
  let fetchedPosts: PostItem[] = [];
  let latestPost: PostItem | null = null;

  const {
    apiKey,
    accountId,
    targetInput,
    message,
    sendWithoutNote,
    limit = 10,
    reactionType = "like",
    commentText,
  } = config;

  const baseUrl = sanitizeBaseUrl(config.baseUrl);
  const slug = extractLinkedInSlug(targetInput);

  if (!apiKey) {
    return {
      success: false,
      logs: [{
        step: 0,
        title: "Validation",
        method: "CLIENT",
        endpoint: "",
        url: "",
        status: "error",
        summary: "Missing Unipile API Key (X-API-KEY).",
        timestamp: new Date().toISOString(),
      }],
      error: "API Key is required",
    };
  }

  if (!accountId) {
    return {
      success: false,
      logs: [{
        step: 0,
        title: "Validation",
        method: "CLIENT",
        endpoint: "",
        url: "",
        status: "error",
        summary: "Missing Unipile Account ID.",
        timestamp: new Date().toISOString(),
      }],
      error: "Account ID is required",
    };
  }

  if (!slug) {
    return {
      success: false,
      logs: [{
        step: 0,
        title: "Validation",
        method: "CLIENT",
        endpoint: "",
        url: "",
        status: "error",
        summary: "Could not extract a valid LinkedIn slug or identifier.",
        timestamp: new Date().toISOString(),
      }],
      error: "Invalid target LinkedIn profile input",
    };
  }

  // STEP 1: Resolve Public Slug to provider_id
  const step1Endpoint = `/users/${encodeURIComponent(slug)}?account_id=${encodeURIComponent(accountId)}`;
  const step1Url = `${baseUrl}${step1Endpoint}`;
  let providerId = "";

  try {
    const step1Res = await fetch(step1Url, {
      method: "GET",
      headers: { "X-API-KEY": apiKey, Accept: "application/json" },
    });

    let step1Data: any = {};
    const step1Text = await step1Res.text();
    try {
      step1Data = step1Text ? JSON.parse(step1Text) : {};
    } catch {
      step1Data = { rawText: step1Text };
    }

    if (!step1Res.ok) {
      const errMsg = getUnipileErrorMessage(step1Data, step1Res);
      logs.push({
        step: 1,
        title: "Resolve Public Slug to provider_id",
        method: "GET",
        endpoint: step1Endpoint,
        url: step1Url,
        status: "error",
        summary: `Failed to resolve profile slug "${slug}": ${errMsg}`,
        timestamp: new Date().toISOString(),
        rawResponse: step1Data,
        error: errMsg,
      });

      return {
        success: false,
        logs,
        error: `Failed to resolve LinkedIn profile: ${errMsg}`,
      };
    }

    providerId = step1Data?.provider_id || step1Data?.id || step1Data?.public_identifier || "";
    if (!providerId.startsWith("ACoAA") && step1Data?.provider_id) {
      providerId = step1Data.provider_id;
    }

    const fullName = step1Data?.name || [step1Data?.first_name, step1Data?.last_name].filter(Boolean).join(" ") || slug;

    resolvedProfile = {
      provider_id: providerId,
      first_name: step1Data?.first_name,
      last_name: step1Data?.last_name,
      name: fullName,
      headline: step1Data?.headline || step1Data?.title || step1Data?.occupation,
      network_distance: step1Data?.network_distance,
      is_relationship: step1Data?.is_relationship,
      profile_picture_url: step1Data?.profile_picture_url || step1Data?.picture_url || step1Data?.avatar,
      public_identifier: step1Data?.public_identifier || slug,
      location: step1Data?.location,
      invitation: step1Data?.invitation,
      raw: step1Data,
    };

    if (!providerId) {
      logs.push({
        step: 1,
        title: "Resolve Public Slug to provider_id",
        method: "GET",
        endpoint: step1Endpoint,
        url: step1Url,
        status: "error",
        summary: `Resolved profile but no valid provider_id (ACoAA...) found for slug "${slug}".`,
        timestamp: new Date().toISOString(),
        rawResponse: step1Data,
        error: "Missing provider_id",
      });

      return {
        success: false,
        logs,
        profile: resolvedProfile,
        error: "Missing provider_id in Unipile response",
      };
    }

    logs.push({
      step: 1,
      title: "Resolve Public Slug to provider_id",
      method: "GET",
      endpoint: step1Endpoint,
      url: step1Url,
      status: "success",
      summary: `Successfully resolved "${slug}" to provider_id: ${providerId} (${fullName})`,
      timestamp: new Date().toISOString(),
      rawResponse: step1Data,
    });
  } catch (err: any) {
    logs.push({
      step: 1,
      title: "Resolve Public Slug to provider_id",
      method: "GET",
      endpoint: step1Endpoint,
      url: step1Url,
      status: "error",
      summary: `Network error connecting to Unipile: ${err.message}`,
      timestamp: new Date().toISOString(),
      error: err.message,
    });

    return { success: false, logs, error: err.message };
  }

  // STEP 2: Check Connection Status & Auto-Send Invite
  const step2Endpoint = `/users/invite`;
  const step2Url = `${baseUrl}${step2Endpoint}`;

  const isFirstDegree =
    resolvedProfile?.is_relationship === true ||
    resolvedProfile?.network_distance === "FIRST_DEGREE" ||
    resolvedProfile?.network_distance === "DISTANCE_1";

  const isPendingInvite =
    resolvedProfile?.invitation?.status === "PENDING" ||
    resolvedProfile?.raw?.invitation_status === "PENDING";

  if (isFirstDegree) {
    logs.push({
      step: 2,
      title: "Check Connection Status & Send Invite",
      method: "CHECK",
      endpoint: step2Endpoint,
      url: step2Url,
      status: "skipped",
      summary: "Already 1st-degree connected. Skipping invite.",
      timestamp: new Date().toISOString(),
      rawResponse: {
        is_relationship: resolvedProfile?.is_relationship,
        network_distance: resolvedProfile?.network_distance,
      },
    });
  } else if (isPendingInvite) {
    logs.push({
      step: 2,
      title: "Check Connection Status & Send Invite",
      method: "CHECK",
      endpoint: step2Endpoint,
      url: step2Url,
      status: "skipped",
      summary: "Invitation already pending. Skipping invite.",
      timestamp: new Date().toISOString(),
      rawResponse: { invitation: resolvedProfile?.invitation },
    });
  } else {
    const invitePayload: Record<string, string> = {
      provider_id: providerId,
      account_id: accountId,
    };

    if (!sendWithoutNote && message && message.trim().length > 0) {
      invitePayload.message = message.trim();
    }

    try {
      const step2Res = await fetch(step2Url, {
        method: "POST",
        headers: {
          "X-API-KEY": apiKey,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(invitePayload),
      });

      let step2Data: any = {};
      const step2Text = await step2Res.text();
      try {
        step2Data = step2Text ? JSON.parse(step2Text) : {};
      } catch {
        step2Data = { rawText: step2Text };
      }

      if (step2Res.ok) {
        logs.push({
          step: 2,
          title: "Check Connection Status & Send Invite",
          method: "POST",
          endpoint: step2Endpoint,
          url: step2Url,
          status: "success",
          summary: `Connection invitation sent successfully${
            invitePayload.message ? " with note" : " without note (saved quota)"
          }.`,
          timestamp: new Date().toISOString(),
          requestBody: invitePayload,
          rawResponse: step2Data,
        });
      } else {
        const errMsg = getUnipileErrorMessage(step2Data, step2Res);
        logs.push({
          step: 2,
          title: "Check Connection Status & Send Invite",
          method: "POST",
          endpoint: step2Endpoint,
          url: step2Url,
          status: "error",
          summary: `Failed to send invitation: ${errMsg}`,
          timestamp: new Date().toISOString(),
          requestBody: invitePayload,
          rawResponse: step2Data,
          error: errMsg,
        });
      }
    } catch (err: any) {
      logs.push({
        step: 2,
        title: "Check Connection Status & Send Invite",
        method: "POST",
        endpoint: step2Endpoint,
        url: step2Url,
        status: "error",
        summary: `Network error sending invitation: ${err.message}`,
        timestamp: new Date().toISOString(),
        requestBody: invitePayload,
        error: err.message,
      });
    }
  }

  // STEP 3: Fetch Target's Posts
  const postLimit = Math.max(1, Math.min(Number(limit) || 10, 50));
  const step3Endpoint = `/users/${encodeURIComponent(providerId)}/posts?account_id=${encodeURIComponent(accountId)}&limit=${postLimit}`;
  const step3Url = `${baseUrl}${step3Endpoint}`;

  try {
    const step3Res = await fetch(step3Url, {
      method: "GET",
      headers: { "X-API-KEY": apiKey, Accept: "application/json" },
    });

    let step3Data: any = {};
    const step3Text = await step3Res.text();
    try {
      step3Data = step3Text ? JSON.parse(step3Text) : {};
    } catch {
      step3Data = { rawText: step3Text };
    }

    if (!step3Res.ok) {
      const errMsg = getUnipileErrorMessage(step3Data, step3Res);
      logs.push({
        step: 3,
        title: "Fetch Target's Posts",
        method: "GET",
        endpoint: step3Endpoint,
        url: step3Url,
        status: "error",
        summary: `Failed to fetch posts: ${errMsg}`,
        timestamp: new Date().toISOString(),
        rawResponse: step3Data,
        error: errMsg,
      });
    } else {
      const rawItems: any[] = Array.isArray(step3Data?.items)
        ? step3Data.items
        : Array.isArray(step3Data)
        ? step3Data
        : [];

      rawItems.sort((a, b) => {
        const dateA = a.parsed_datetime ? new Date(a.parsed_datetime).getTime() : 0;
        const dateB = b.parsed_datetime ? new Date(b.parsed_datetime).getTime() : 0;
        return dateB - dateA;
      });

      fetchedPosts = rawItems.map((item) => ({
        id: item.id,
        social_id: item.social_id || item.id,
        text: item.text || item.content || item.commentary || "",
        parsed_datetime: item.parsed_datetime,
        date: item.date,
        like_count: item.like_count ?? item.reaction_counts?.total ?? 0,
        comment_count: item.comment_count ?? 0,
        repost_count: item.repost_count ?? 0,
        reaction_counts: item.reaction_counts || {},
        permissions: {
          can_react: item.permissions?.can_react !== false,
          can_post_comments: item.permissions?.can_post_comments !== false,
          can_share: item.permissions?.can_share !== false,
        },
        attachments: item.attachments || [],
        author: {
          name: item.author?.name || resolvedProfile?.name,
          headline: item.author?.headline || resolvedProfile?.headline,
          profile_picture_url: item.author?.profile_picture_url || resolvedProfile?.profile_picture_url,
        },
        raw: item,
      }));

      if (fetchedPosts.length > 0) {
        latestPost = fetchedPosts[0];
        logs.push({
          step: 3,
          title: "Fetch Target's Posts",
          method: "GET",
          endpoint: step3Endpoint,
          url: step3Url,
          status: "success",
          summary: `Fetched ${fetchedPosts.length} posts sorted by parsed_datetime. Latest social_id: ${latestPost.social_id}`,
          timestamp: new Date().toISOString(),
          rawResponse: step3Data,
        });
      } else {
        logs.push({
          step: 3,
          title: "Fetch Target's Posts",
          method: "GET",
          endpoint: step3Endpoint,
          url: step3Url,
          status: "success",
          summary: `Target profile has no published posts (0 returned). Subsequent like/comment skipped.`,
          timestamp: new Date().toISOString(),
          rawResponse: step3Data,
        });
      }
    }
  } catch (err: any) {
    logs.push({
      step: 3,
      title: "Fetch Target's Posts",
      method: "GET",
      endpoint: step3Endpoint,
      url: step3Url,
      status: "error",
      summary: `Network error fetching posts: ${err.message}`,
      timestamp: new Date().toISOString(),
      error: err.message,
    });
  }

  // STEP 4: Auto-Like Latest Post
  const step4Endpoint = `/posts/reaction`;
  const step4Url = `${baseUrl}${step4Endpoint}`;

  if (!latestPost) {
    logs.push({
      step: 4,
      title: "Auto-Like the Latest Post",
      method: "POST",
      endpoint: step4Endpoint,
      url: step4Url,
      status: "skipped",
      summary: "No posts available to react to. Skipping like step.",
      timestamp: new Date().toISOString(),
    });
  } else if (latestPost.permissions?.can_react === false) {
    logs.push({
      step: 4,
      title: "Auto-Like the Latest Post",
      method: "POST",
      endpoint: step4Endpoint,
      url: step4Url,
      status: "skipped",
      summary: `Post permissions do not allow reactions. Skipping like step.`,
      timestamp: new Date().toISOString(),
    });
  } else {
    const reactionPayload = {
      account_id: accountId,
      post_id: latestPost.social_id,
      reaction_type: reactionType || "like",
    };

    try {
      const step4Res = await fetch(step4Url, {
        method: "POST",
        headers: {
          "X-API-KEY": apiKey,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(reactionPayload),
      });

      let step4Data: any = {};
      const step4Text = await step4Res.text();
      try {
        step4Data = step4Text ? JSON.parse(step4Text) : {};
      } catch {
        step4Data = { rawText: step4Text };
      }

      if (step4Res.ok) {
        logs.push({
          step: 4,
          title: "Auto-Like the Latest Post",
          method: "POST",
          endpoint: step4Endpoint,
          url: step4Url,
          status: "success",
          summary: `Successfully reacted "${reactionType || 'like'}" to latest post (${latestPost.social_id})`,
          timestamp: new Date().toISOString(),
          requestBody: reactionPayload,
          rawResponse: step4Data,
        });
      } else {
        const errMsg = getUnipileErrorMessage(step4Data, step4Res);
        logs.push({
          step: 4,
          title: "Auto-Like the Latest Post",
          method: "POST",
          endpoint: step4Endpoint,
          url: step4Url,
          status: "error",
          summary: `Failed to react to post: ${errMsg}`,
          timestamp: new Date().toISOString(),
          requestBody: reactionPayload,
          rawResponse: step4Data,
          error: errMsg,
        });
      }
    } catch (err: any) {
      logs.push({
        step: 4,
        title: "Auto-Like the Latest Post",
        method: "POST",
        endpoint: step4Endpoint,
        url: step4Url,
        status: "error",
        summary: `Network error reacting to post: ${err.message}`,
        timestamp: new Date().toISOString(),
        requestBody: reactionPayload,
        error: err.message,
      });
    }
  }

  // STEP 5: Auto-Comment on Latest Post
  const encodedSocialId = latestPost?.social_id ? encodeURIComponent(latestPost.social_id) : "";
  const step5Endpoint = `/posts/${encodedSocialId || "{encodedSocialId}"}/comments`;
  const step5Url = `${baseUrl}${step5Endpoint}`;

  if (!latestPost) {
    logs.push({
      step: 5,
      title: "Auto-Comment on the Latest Post",
      method: "POST",
      endpoint: step5Endpoint,
      url: step5Url,
      status: "skipped",
      summary: "No posts available to comment on. Skipping comment step.",
      timestamp: new Date().toISOString(),
    });
  } else if (!commentText || commentText.trim().length === 0) {
    logs.push({
      step: 5,
      title: "Auto-Comment on the Latest Post",
      method: "POST",
      endpoint: step5Endpoint,
      url: step5Url,
      status: "skipped",
      summary: "No comment text provided in configuration. Skipping comment step.",
      timestamp: new Date().toISOString(),
    });
  } else if (latestPost.permissions?.can_post_comments === false) {
    logs.push({
      step: 5,
      title: "Auto-Comment on the Latest Post",
      method: "POST",
      endpoint: step5Endpoint,
      url: step5Url,
      status: "skipped",
      summary: `Post permissions do not allow commenting. Skipping comment step.`,
      timestamp: new Date().toISOString(),
    });
  } else {
    const trimmedComment = commentText.trim();
    const formData = new FormData();
    formData.append("account_id", accountId);
    formData.append("text", trimmedComment);

    try {
      const step5Res = await fetch(step5Url, {
        method: "POST",
        headers: { "X-API-KEY": apiKey, Accept: "application/json" },
        body: formData,
      });

      let step5Data: any = {};
      const step5Text = await step5Res.text();
      try {
        step5Data = step5Text ? JSON.parse(step5Text) : {};
      } catch {
        step5Data = { rawText: step5Text };
      }

      if (step5Res.ok) {
        logs.push({
          step: 5,
          title: "Auto-Comment on the Latest Post",
          method: "POST",
          endpoint: step5Endpoint,
          url: step5Url,
          status: "success",
          summary: `Successfully commented on post (${latestPost.social_id}): "${trimmedComment}"`,
          timestamp: new Date().toISOString(),
          requestBody: { account_id: accountId, text: trimmedComment },
          rawResponse: step5Data,
        });
      } else {
        const errMsg = getUnipileErrorMessage(step5Data, step5Res);
        logs.push({
          step: 5,
          title: "Auto-Comment on the Latest Post",
          method: "POST",
          endpoint: step5Endpoint,
          url: step5Url,
          status: "error",
          summary: `Failed to comment on post: ${errMsg}`,
          timestamp: new Date().toISOString(),
          requestBody: { account_id: accountId, text: trimmedComment },
          rawResponse: step5Data,
          error: errMsg,
        });
      }
    } catch (err: any) {
      logs.push({
        step: 5,
        title: "Auto-Comment on the Latest Post",
        method: "POST",
        endpoint: step5Endpoint,
        url: step5Url,
        status: "error",
        summary: `Network error commenting on post: ${err.message}`,
        timestamp: new Date().toISOString(),
        requestBody: { account_id: accountId, text: trimmedComment },
        error: err.message,
      });
    }
  }

  return {
    success: logs.every((l) => l.status !== "error"),
    logs,
    profile: resolvedProfile,
    posts: fetchedPosts,
    latestPost,
  };
}
