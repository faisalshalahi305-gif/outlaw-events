export type KickStreamer = {
  username: string;
  displayName: string;
  avatar: string;
  bio: string;
  followers: number;
  isLive: boolean;
  viewerCount: number;
  streamTitle: string;
  thumbnail: string | null;
  platform: "Kick";
  url: string;
};

export const KICK_STREAMERS = [
  "D7DN",
  "i_CARLOS",
  "Maramjk",
  "Roven9",
  "TheD7mi",
  "viEquL",
  "HalaMadrld",
  "IIRYOOF",
  "mo7x",
  "Rashed7cr",
  "qTuurkii",
  "kloovr",
  "ONLY3BED",
  "1BeKi",
  "Amjaad8",
  "2lovx",
  "LTxMax",
  "iaz00zi",
  "TEFN",
  "Abu_Samrah",
  "LuneDee",
  "rsyq",
  "lsalman",
  "iNaax",
  "i3L0",
  "iEnemy01",
  "z3zw",
  "4adell",
  "v7MOD1",
  "illeah",
  "Mazyadov",
  "iClassie",
  "Trook",
  "1tr_7",
  "ID7mny",
  "modchi23",
  "Evely3",
  "abussara",
  "KeepSmiIe",
  "1LCFEER",
  "su_s",
  "1SLaW",
  "iHIMO",
  "ronn1i",
  "INQ",
  "F5Mx",
  "MJBOR",
  "TRONTT",
  "Noura_G2",
  "oMuTx",
  "izoz11",
  "Talf_305",
  "ShanKS_u",
  "MoShz",
  "1CJx",
  "DHM_9",
  "Dahrooj",
  "IMOD",
  "iMERT",
  "iD7D7",
  "QYem",
  "7arith",
  "lFxr",
  "Anas7",
  "iDew",
  "5ald",
  "Jehad_abr",
  "DBIIS",
  "iRellaX",
  "S0VE",
  "Fwaz",
  "Fed0tb",
  "xEllily",
  "ii2a",
  "mezaar",
  "4Evil",
  "iMsh4",
  "orkw",
  "alqallaf",
  "vMo0",
  "Perfct",
  "feras_am",
  "2bo5li",
  "iiKillua",
  "R3DULZ",
  "llw3",
  "11Hussin",
  "fttir",
  "vRakan2",
  "Shhhd",
  "SKY7C",
  "dozaro",
  "onbader",
  "rmksx",
  "Shadoo",
] as const;

function fallback(username: string): KickStreamer {
  return {
    username,
    displayName: username,
    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random`,
    bio: "تعذر جلب البيانات",
    followers: 0,
    isLive: false,
    viewerCount: 0,
    streamTitle: "",
    thumbnail: null,
    platform: "Kick",
    url: `https://kick.com/${username}`,
  };
}

async function fetchOne(username: string): Promise<KickStreamer> {
  try {
    const response = await fetch(`https://kick.com/api/v2/channels/${username}`, {
      headers: {
        accept: "application/json",
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) throw new Error(`status ${response.status}`);

    const data = (await response.json()) as {
      user?: { username?: string; profile_pic?: string | null; bio?: string | null };
      followers_count?: number;
      livestream?: {
        viewer_count?: number;
        session_title?: string;
        thumbnail?: { url?: string } | null;
      } | null;
    };

    const live = data.livestream ?? null;

    return {
      username,
      displayName: data.user?.username ?? username,
      avatar:
        data.user?.profile_pic ??
        `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random`,
      bio: data.user?.bio || "لا توجد نبذة",
      followers: data.followers_count ?? 0,
      isLive: live !== null,
      viewerCount: live?.viewer_count ?? 0,
      streamTitle: live?.session_title ?? "",
      thumbnail: live?.thumbnail?.url ?? null,
      platform: "Kick",
      url: `https://kick.com/${username}`,
    };
  } catch {
    return fallback(username);
  }
}

/** Fetch every Kick channel with a small concurrency window, newest state first. */
export async function loadKickStreamers(): Promise<KickStreamer[]> {
  const names = [...KICK_STREAMERS];
  const results: KickStreamer[] = [];
  const CONCURRENCY = 12;

  for (let i = 0; i < names.length; i += CONCURRENCY) {
    const chunk = names.slice(i, i + CONCURRENCY);
    results.push(...(await Promise.all(chunk.map(fetchOne))));
  }

  return results.sort((a, b) =>
    a.isLive === b.isLive ? b.followers - a.followers : a.isLive ? -1 : 1,
  );
}
