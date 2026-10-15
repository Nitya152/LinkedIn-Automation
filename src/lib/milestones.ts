import { RelationshipMilestone, PostItem, ProfileInfo } from "@/types";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function extractMilestones(
  profile: ProfileInfo | null | undefined,
  posts: PostItem[] = []
): RelationshipMilestone[] {
  const milestones: RelationshipMilestone[] = [];
  if (!profile) return milestones;

  const raw = profile.raw || {};
  const firstName =
    profile.first_name ||
    profile.name?.split(" ")[0] ||
    "there";

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12

  // 1. Extract Work Anniversaries & New Roles from Work Experience
  const experiences: any[] =
    raw.experience ||
    raw.experiences ||
    raw.positions ||
    raw.work_experience ||
    [];

  if (Array.isArray(experiences) && experiences.length > 0) {
    for (let i = 0; i < experiences.length; i++) {
      const exp = experiences[i];
      const isCurrent =
        exp.is_current === true ||
        exp.isCurrent === true ||
        !exp.end_date ||
        exp.end_date === null;

      if (!isCurrent) continue;

      const company = exp.company || exp.company_name || exp.employer || "their company";
      const title = exp.title || exp.role || exp.position || "their role";

      // Parse start_date (supports { month, year } or ISO strings)
      let startYear: number | null = null;
      let startMonth: number | null = null;

      if (typeof exp.start_date === "object" && exp.start_date !== null) {
        startYear = Number(exp.start_date.year) || null;
        startMonth = Number(exp.start_date.month) || null;
      } else if (typeof exp.start_date === "string") {
        const parts = exp.start_date.split(/[-/]/);
        if (parts.length >= 2) {
          startYear = parseInt(parts[0]);
          startMonth = parseInt(parts[1]);
        }
      }

      if (startYear && startYear > 1980 && startYear <= currentYear) {
        const tenureYears = currentYear - startYear;
        const monthName = startMonth && startMonth >= 1 && startMonth <= 12
          ? MONTH_NAMES[startMonth - 1]
          : null;

        // Check if New Role (started within the past 120 days or recent year)
        const isRecentRole =
          startYear === currentYear ||
          (startYear === currentYear - 1 && currentMonth <= 3 && startMonth && startMonth >= 10);

        if (isRecentRole) {
          milestones.push({
            id: `new_role_${i}_${startYear}`,
            type: "NEW_ROLE",
            title: `New Role: ${title} at ${company}`,
            dateText: monthName ? `Started ${monthName} ${startYear}` : `Started in ${startYear}`,
            month: startMonth || undefined,
            company,
            roleTitle: title,
            context: `${title} at ${company} (Joined ${monthName ? `${monthName} ` : ""}${startYear})`,
            suggestedMessage: `Hi ${firstName}, huge congratulations on stepping into your new role as ${title} at ${company}! Wishing you tremendous success in this exciting chapter.`,
            source: "EXPERIENCE",
          });
        }

        // Work Anniversary (if with company for 1+ years)
        if (tenureYears >= 1) {
          const dateLabel = monthName ? `Every ${monthName} (since ${startYear})` : `Since ${startYear}`;
          milestones.push({
            id: `anniversary_${i}_${startYear}`,
            type: "WORK_ANNIVERSARY",
            title: `${tenureYears} Year Work Anniversary at ${company}`,
            dateText: dateLabel,
            month: startMonth || undefined,
            yearsCount: tenureYears,
            company,
            roleTitle: title,
            context: `${title} at ${company} (${tenureYears} years completed since ${startYear})`,
            suggestedMessage: `Hi ${firstName}, wishing you a very Happy Work Anniversary! Congratulations on reaching ${tenureYears} years at ${company}—truly inspiring journey.`,
            source: "EXPERIENCE",
          });
        }
      }
    }
  }

  // 2. Extract Birthday (from contact info or raw metadata)
  const birthdateObj =
    raw.birthdate ||
    raw.contact_info?.birthdate ||
    raw.contact_info?.birthday ||
    raw.birthday;

  if (birthdateObj) {
    let bMonth: number | null = null;
    let bDay: number | null = null;

    if (typeof birthdateObj === "object") {
      bMonth = Number(birthdateObj.month) || null;
      bDay = Number(birthdateObj.day) || null;
    } else if (typeof birthdateObj === "string") {
      const match = birthdateObj.match(/(\d{1,2})[/-](\d{1,2})/);
      if (match) {
        bMonth = parseInt(match[1]);
        bDay = parseInt(match[2]);
      }
    }

    if (bMonth && bMonth >= 1 && bMonth <= 12) {
      const monthStr = MONTH_NAMES[bMonth - 1];
      const dayStr = bDay ? ` ${bDay}` : "";
      milestones.push({
        id: "birthday_profile",
        type: "BIRTHDAY",
        title: `Birthday: ${monthStr}${dayStr}`,
        dateText: `${monthStr}${dayStr}`,
        month: bMonth,
        day: bDay || undefined,
        context: `Birthdate listed in contact info: ${monthStr}${dayStr}`,
        suggestedMessage: `Happy Birthday, ${firstName}! Wishing you a wonderful celebration and a prosperous, fulfilling year ahead.`,
        source: "CONTACT_INFO",
      });
    }
  }

  // 3. Scan Posts for Personal Anniversaries & Celebrations
  if (Array.isArray(posts) && posts.length > 0) {
    const anniversaryRegex = /\b(?:anniversary|married|wedding|years together|with my (?:wife|husband|spouse|partner))\b/i;
    const celebrationRegex = /\b(?:honored to receive|proud to announce|thrilled to share|keynote speaker|featured in|award winner|grateful to be recognized)\b/i;

    for (let idx = 0; idx < posts.length; idx++) {
      const post = posts[idx];
      const text = post.text || "";
      if (!text || text.length < 15) continue;

      const dateStr = post.parsed_datetime
        ? new Date(post.parsed_datetime).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : post.date || "Recent Post";

      if (anniversaryRegex.test(text)) {
        milestones.push({
          id: `personal_anniversary_${idx}`,
          type: "PERSONAL_ANNIVERSARY",
          title: `Personal Celebration: Anniversary Mention`,
          dateText: `Shared on ${dateStr}`,
          context: `Post excerpt: "${text.slice(0, 120)}..."`,
          suggestedMessage: `Hi ${firstName}, came across your post celebrating your anniversary—congratulations! Wishing you both continued happiness and joy.`,
          source: "POST_KEYWORD",
        });
        break; // Only capture the most recent
      }

      if (celebrationRegex.test(text)) {
        milestones.push({
          id: `honor_milestone_${idx}`,
          type: "PERSONAL_ANNIVERSARY",
          title: `Milestone & Recognition Event`,
          dateText: `Shared on ${dateStr}`,
          context: `Post excerpt: "${text.slice(0, 120)}..."`,
          suggestedMessage: `Hi ${firstName}, saw your recent milestone update regarding this recognition—huge congratulations! Really inspiring work.`,
          source: "POST_KEYWORD",
        });
        break; // Only capture the most recent
      }
    }
  }

  return milestones;
}
