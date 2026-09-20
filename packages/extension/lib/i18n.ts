export type ResolvedLang = "zh" | "zh-Hant" | "en" | "ja" | "ko" | "es";
export type LanguageSetting = "auto" | ResolvedLang;

type Msg = string | readonly string[];

const zh = {
  "app.name": "Tweet 911",
  "options.intro":
    "配置扩展调用的 Worker API。不要指向 api.typesafe.ai，请使用你的 Cloudflare Worker。",
  "options.apiBase": "API 根地址",
  "options.apiBase.hint":
    "不要带末尾斜杠。部署后填 workers.dev 或自定义域名。自定义域名需要加到 wxt.config.ts 的 host_permissions。",
  "options.apiKey": "API 密钥（可选）",
  "options.apiKey.hint": "填写后会以 Authorization: Bearer … 发送。",
  "options.language": "语言",
  "options.language.auto": "自动（跟随浏览器）",
  "options.language.zh": "简体中文",
  "options.language.zhHant": "繁體中文",
  "options.language.en": "English",
  "options.language.ja": "日本語",
  "options.language.ko": "한국어",
  "options.language.es": "Español",
  "options.save": "保存",
  "options.saved": "已保存。",
  "options.source": "源码仓库",
  "options.source.action": "在 GitHub 打开",
  "options.block": "屏蔽选项",
  "options.block.off": "不屏蔽",
  "options.block.blur": "模糊",
  "options.block.hide": "隐藏",
  "options.block.hint":
    "模糊会蒙住内容，点「仍然显示」可临时揭开，刷新后又会蒙上。隐藏则从时间线拿掉。",
  "options.threshold": "屏蔽阈值",
  "options.threshold.post": "帖子屏蔽阈值",
  "options.threshold.reply": "评论屏蔽阈值",
  "options.threshold.mid": "疑似（黄）",
  "options.threshold.high": "实锤（红）",
  "popup.stats.total": "总共检测",
  "popup.stats.today": "今天检测",
  "popup.stats.unit": "条",
  "veil.by": "由 Tweet 911 检测",
  "veil.mid.ai": "疑似为 AI 生成",
  "veil.high.ai": "实锤为 AI 生成",
  "veil.mid.porn": "疑似为色情引流",
  "veil.high.porn": "实锤为色情引流",
  "veil.mid.para": "疑似为复读机",
  "veil.high.para": "实锤为复读机",
  "veil.restore": "仍然显示",
  "metric.ai.name": "AI 味",
  "metric.ai.short": "AI",
  "metric.ai.what": "这条帖子有多像大模型写的。",
  "metric.ai.high": "很可能是 AI 写的",
  "metric.ai.mid": "不确定，人和模型都有可能",
  "metric.ai.low": "更像人写的",
  "metric.ai.true": [
    "典型 ChatGPT 句式：不是 X，而是 Y",
    "工整的三段论、破折号、空泛流畅",
    "delve / leverage / paradigm 一类套话",
    "没有错字、口语或具体个人细节",
  ],
  "metric.ai.false": [
    "错字、口语、半截话",
    "具体经历、立场或圈内细节",
    "不规则节奏、靠共同语境的笑话",
  ],
  "metric.porn.name": "色情贴",
  "metric.porn.short": "色情",
  "metric.porn.what": "是否在做色情引流、约炮或导流到站外。",
  "metric.porn.high": "很可能是色情引流",
  "metric.porn.mid": "有点擦边，还不能定",
  "metric.porn.low": "不像引流",
  "metric.porn.true": [
    "「线下可约 / 主页能看 / 太涩了」一类话术",
    "把人往主页、快手等地方导性内容",
    "用户名或简介在打约炮广告",
    "评论只是薄薄一层私信/线下邀请",
  ],
  "metric.porn.false": [
    "普通调情或约会玩笑，没有导流",
    "讨论行业新闻，并不拉客",
    "略擦边的私人闲聊",
  ],
  "metric.para.name": "复读机",
  "metric.para.short": "复读",
  "metric.para.what": "这条回复有没有只是换词复述楼主。",
  "metric.para.high": "很可能是复读机器人",
  "metric.para.mid": "有点像复述，还不能定",
  "metric.para.low": "不像复读",
  "metric.para.true": [
    "用近义词把楼主的观点再说一遍",
    "没有新观点、事实、笑话或问题",
    "典型刷互动：附和原帖混赞",
  ],
  "metric.para.false": [
    "补了独立看法、经历、吐槽或提问",
    "只点一下原帖然后岔开",
    "不是回复，或没有楼主原文",
  ],
  "popover.score": "分数",
  "popover.powered": "由 open-compute 驱动",
  "popover.true": "偏高时",
  "popover.false": "偏低时",
  "popover.overall": "综合",
  "popover.overall.high": "至少一项明显偏高",
  "popover.overall.mid": "有不确定项，还不能定",
  "popover.overall.low": "三项都偏低，比较干净",
  "state.loading": "评分中",
  "state.error": "评分失败",
  "state.empty": "没有可评分的文本或图片",
} as const satisfies Record<string, Msg>;

type Catalog = { [K in keyof typeof zh]: Msg };

const zhHant: Catalog = {
  "app.name": "Tweet 911",
  "options.intro":
    "設定擴充功能呼叫的 Worker API。不要指向 api.typesafe.ai，請使用你的 Cloudflare Worker。",
  "options.apiBase": "API 根位址",
  "options.apiBase.hint":
    "不要帶結尾斜線。部署後填 workers.dev 或自訂網域。自訂網域需要加到 wxt.config.ts 的 host_permissions。",
  "options.apiKey": "API 金鑰（選填）",
  "options.apiKey.hint": "填寫後會以 Authorization: Bearer … 傳送。",
  "options.language": "語言",
  "options.language.auto": "自動（跟隨瀏覽器）",
  "options.language.zh": "简体中文",
  "options.language.zhHant": "繁體中文",
  "options.language.en": "English",
  "options.language.ja": "日本語",
  "options.language.ko": "한국어",
  "options.language.es": "Español",
  "options.save": "儲存",
  "options.saved": "已儲存。",
  "options.source": "原始碼倉庫",
  "options.source.action": "在 GitHub 開啟",
  "options.block": "屏蔽選項",
  "options.block.off": "不屏蔽",
  "options.block.blur": "模糊",
  "options.block.hide": "隱藏",
  "options.block.hint":
    "模糊會蓋住內容，點「仍然顯示」可暫時揭開，重新整理後又會蓋上。隱藏則從時間軸拿掉。",
  "options.threshold": "屏蔽閾值",
  "options.threshold.post": "貼文屏蔽閾值",
  "options.threshold.reply": "留言屏蔽閾值",
  "options.threshold.mid": "疑似（黃）",
  "options.threshold.high": "實錘（紅）",
  "popup.stats.total": "總共檢測",
  "popup.stats.today": "今天檢測",
  "popup.stats.unit": "則",
  "veil.by": "由 Tweet 911 檢測",
  "veil.mid.ai": "疑似為 AI 生成",
  "veil.high.ai": "實錘為 AI 生成",
  "veil.mid.porn": "疑似為色情引流",
  "veil.high.porn": "實錘為色情引流",
  "veil.mid.para": "疑似為復讀機",
  "veil.high.para": "實錘為復讀機",
  "veil.restore": "仍然顯示",
  "metric.ai.name": "AI 味",
  "metric.ai.short": "AI",
  "metric.ai.what": "這則貼文有多像大模型寫的。",
  "metric.ai.high": "很可能是 AI 寫的",
  "metric.ai.mid": "不確定，人和模型都有可能",
  "metric.ai.low": "更像人寫的",
  "metric.ai.true": [
    "典型 ChatGPT 句式：不是 X，而是 Y",
    "工整的三段論、破折號、空泛流暢",
    "delve / leverage / paradigm 一類套話",
    "沒有錯字、口語或具體個人細節",
  ],
  "metric.ai.false": [
    "錯字、口語、半截話",
    "具體經歷、立場或圈內細節",
    "不規則節奏、靠共同語境的笑話",
  ],
  "metric.porn.name": "色情貼",
  "metric.porn.short": "色情",
  "metric.porn.what": "是否在做色情引流、約砲或導流到站外。",
  "metric.porn.high": "很可能是色情引流",
  "metric.porn.mid": "有點擦邊，還不能定",
  "metric.porn.low": "不像引流",
  "metric.porn.true": [
    "「線下可約 / 主頁能看 / 太澀了」一類話術",
    "把人往主頁、快手等地方導性內容",
    "使用者名稱或簡介在打約砲廣告",
    "留言只是薄薄一層私訊／線下邀請",
  ],
  "metric.porn.false": [
    "普通調情或約會玩笑，沒有導流",
    "討論產業新聞，並不拉客",
    "略擦邊的私人閒聊",
  ],
  "metric.para.name": "復讀機",
  "metric.para.short": "復讀",
  "metric.para.what": "這則回覆有沒有只是換詞複述樓主。",
  "metric.para.high": "很可能是復讀機器人",
  "metric.para.mid": "有點像複述，還不能定",
  "metric.para.low": "不像復讀",
  "metric.para.true": [
    "用近義詞把樓主的觀點再說一遍",
    "沒有新觀點、事實、笑話或問題",
    "典型刷互動：附和原帖混讚",
  ],
  "metric.para.false": [
    "補了獨立看法、經歷、吐槽或提問",
    "只點一下原帖然後岔開",
    "不是回覆，或沒有樓主原文",
  ],
  "popover.score": "分數",
  "popover.powered": "由 open-compute 驅動",
  "popover.true": "偏高時",
  "popover.false": "偏低時",
  "popover.overall": "綜合",
  "popover.overall.high": "至少一項明顯偏高",
  "popover.overall.mid": "有不確定項，還不能定",
  "popover.overall.low": "三項都偏低，比較乾淨",
  "state.loading": "評分中",
  "state.error": "評分失敗",
  "state.empty": "沒有可評分的文字或圖片",
};

const en: Catalog = {
  "app.name": "Tweet 911",
  "options.intro":
    "Configure the Worker API the extension calls. Do not point at api.typesafe.ai — use your Cloudflare Worker.",
  "options.apiBase": "API base URL",
  "options.apiBase.hint":
    "No trailing slash. After deploy, paste your workers.dev URL or custom domain. Custom domains need host_permissions in wxt.config.ts.",
  "options.apiKey": "API key (optional)",
  "options.apiKey.hint": "Sent as Authorization: Bearer … when set.",
  "options.language": "Language",
  "options.language.auto": "Auto (browser)",
  "options.language.zh": "简体中文",
  "options.language.zhHant": "繁體中文",
  "options.language.en": "English",
  "options.language.ja": "日本語",
  "options.language.ko": "한국어",
  "options.language.es": "Español",
  "options.save": "Save",
  "options.saved": "Saved.",
  "options.source": "Source",
  "options.source.action": "Open on GitHub",
  "options.block": "Filter",
  "options.block.off": "Off",
  "options.block.blur": "Blur",
  "options.block.hide": "Hide",
  "options.block.hint":
    "Blur covers the post. “Show anyway” uncovers it until you refresh. Hide takes it off the timeline.",
  "options.threshold": "Filter threshold",
  "options.threshold.post": "Post filter threshold",
  "options.threshold.reply": "Reply filter threshold",
  "options.threshold.mid": "Suspected (yellow)",
  "options.threshold.high": "Confirmed (red)",
  "popup.stats.total": "All time",
  "popup.stats.today": "Today",
  "popup.stats.unit": "posts",
  "veil.by": "Detected by Tweet 911",
  "veil.mid.ai": "Suspected AI-written",
  "veil.high.ai": "Confirmed AI-written",
  "veil.mid.porn": "Suspected solicitation",
  "veil.high.porn": "Confirmed solicitation",
  "veil.mid.para": "Suspected parrot",
  "veil.high.para": "Confirmed parrot",
  "veil.restore": "Show anyway",
  "metric.ai.name": "AI taste",
  "metric.ai.short": "AI",
  "metric.ai.what": "How much this post reads like it was written by an LLM.",
  "metric.ai.high": "Likely AI-written",
  "metric.ai.mid": "Uncertain — could be either",
  "metric.ai.low": "Likely human-written",
  "metric.ai.true": [
    "Classic ChatGPT tells: “It's not X. It's Y.”",
    "Rule-of-three lists, heavy em dashes, generic polish",
    "Buzzwords: delve, leverage, paradigm, tapestry",
    "Fluent prose with no typos, slang, or personal detail",
  ],
  "metric.ai.false": [
    "Typos, slang, unfinished thoughts",
    "Specific anecdotes, opinions, insider detail",
    "Irregular rhythm, in-jokes, raw emotion",
  ],
  "metric.porn.name": "Solicitation",
  "metric.porn.short": "NSFW",
  "metric.porn.what":
    "Whether this is sexual traffic bait, meetup invites, or off-platform porn funneling.",
  "metric.porn.high": "Likely porn solicitation",
  "metric.porn.mid": "Borderline — not sure yet",
  "metric.porn.low": "Likely clean",
  "metric.porn.true": [
    "Meetup / homepage / “too spicy” bait phrases",
    "Directing readers to a profile or Kuaishou for sexual content",
    "Handle or bio advertising paid/offline sex",
    "Comments that are thin covers for DMs or meetups",
  ],
  "metric.porn.false": [
    "Normal flirting without a funnel",
    "News or talk about the industry, not bait",
    "Mildly suggestive personal chat",
  ],
  "metric.para.name": "Parrot",
  "metric.para.short": "Echo",
  "metric.para.what":
    "Whether this reply mostly restates the parent post in different words.",
  "metric.para.high": "Likely a paraphrase bot",
  "metric.para.mid": "Kinda echoey — not sure yet",
  "metric.para.low": "Likely original",
  "metric.para.true": [
    "Restates the parent claim with synonyms",
    "No new opinion, fact, joke, or question",
    "Engagement-farming echo of the OP",
  ],
  "metric.para.false": [
    "Adds a distinct take, story, joke, or question",
    "Quotes briefly then diverges",
    "Not a reply, or no parent text",
  ],
  "popover.score": "Score",
  "popover.powered": "Powered by open-compute",
  "popover.true": "High when",
  "popover.false": "Low when",
  "popover.overall": "Overall",
  "popover.overall.high": "At least one signal is clearly high",
  "popover.overall.mid": "Something is uncertain",
  "popover.overall.low": "All three are low — looks clean",
  "state.loading": "Scoring",
  "state.error": "Scoring failed",
  "state.empty": "No text or images to score",
};

const ja: Catalog = {
  "app.name": "Tweet 911",
  "options.intro":
    "拡張機能が呼ぶ Worker API を設定します。api.typesafe.ai ではなく、自分の Cloudflare Worker を指定してください。",
  "options.apiBase": "API ベース URL",
  "options.apiBase.hint":
    "末尾のスラッシュは不要。デプロイ後に workers.dev かカスタムドメインを入れてください。カスタムドメインは wxt.config.ts の host_permissions に追加します。",
  "options.apiKey": "API キー（任意）",
  "options.apiKey.hint": "設定すると Authorization: Bearer … で送ります。",
  "options.language": "言語",
  "options.language.auto": "自動（ブラウザに合わせる）",
  "options.language.zh": "简体中文",
  "options.language.zhHant": "繁體中文",
  "options.language.en": "English",
  "options.language.ja": "日本語",
  "options.language.ko": "한국어",
  "options.language.es": "Español",
  "options.save": "保存",
  "options.saved": "保存しました。",
  "options.source": "ソース",
  "options.source.action": "GitHub で開く",
  "options.block": "フィルター",
  "options.block.off": "オフ",
  "options.block.blur": "ぼかし",
  "options.block.hide": "非表示",
  "options.block.hint":
    "ぼかしは内容を覆います。「それでも表示」で一時的に外せます。再読み込みすると戻ります。非表示はタイムラインから外します。",
  "options.threshold": "しきい値",
  "options.threshold.post": "投稿のしきい値",
  "options.threshold.reply": "返信のしきい値",
  "options.threshold.mid": "疑い（黄）",
  "options.threshold.high": "確定（赤）",
  "popup.stats.total": "累計検出",
  "popup.stats.today": "今日の検出",
  "popup.stats.unit": "件",
  "veil.by": "Tweet 911 が検出",
  "veil.mid.ai": "AI生成の疑い",
  "veil.high.ai": "AI生成と確定",
  "veil.mid.porn": "ポルノ誘導の疑い",
  "veil.high.porn": "ポルノ誘導と確定",
  "veil.mid.para": "オウム返しの疑い",
  "veil.high.para": "オウム返しと確定",
  "veil.restore": "それでも表示",
  "metric.ai.name": "AI味",
  "metric.ai.short": "AI",
  "metric.ai.what": "この投稿がどれだけ大規模モデルらしいか。",
  "metric.ai.high": "AIが書いた可能性が高い",
  "metric.ai.mid": "まだ判断できない",
  "metric.ai.low": "人が書いた可能性が高い",
  "metric.ai.true": [
    "典型的な ChatGPT 構文：XではなくY",
    "整いすぎた三部構成、ダッシュ、空虚な流暢さ",
    "delve / leverage / paradigm などの常套句",
    "誤字・口語・具体的な個人情報がない",
  ],
  "metric.ai.false": [
    "誤字、口語、途中で切れた文",
    "具体的な体験、立場、内輪の話",
    "不規則なリズム、共有前提のジョーク",
  ],
  "metric.porn.name": "ポルノ誘導",
  "metric.porn.short": "NSFW",
  "metric.porn.what": "性的な誘導、オフ会、外部への誘導かどうか。",
  "metric.porn.high": "ポルノ誘導の可能性が高い",
  "metric.porn.mid": "際どいが、まだ断定できない",
  "metric.porn.low": "誘導ではなさそう",
  "metric.porn.true": [
    "オフ会可／プロフィール見て／刺激的、といった誘い文句",
    "プロフィールや他アプリへ性的コンテンツを誘導",
    "ユーザー名や自己紹介が援助交際・オフ会広告",
    "返信が DM やオフ会への薄い口実",
  ],
  "metric.porn.false": [
    "誘導のない普通の flirt / デートの冗談",
    "業界ニュースの話で、客引きではない",
    "やや際どい私的な雑談",
  ],
  "metric.para.name": "オウム返し",
  "metric.para.short": "反復",
  "metric.para.what": "親投稿を言い換えただけの返信かどうか。",
  "metric.para.high": "言い換えボットの可能性が高い",
  "metric.para.mid": "少し反復的だが、まだ断定できない",
  "metric.para.low": "反復ではなさそう",
  "metric.para.true": [
    "親投稿の主張を類義語で繰り返す",
    "新しい意見・事実・冗談・質問がない",
    "いいね稼ぎのエコー",
  ],
  "metric.para.false": [
    "独自の見解、体験、ツッコミ、質問を足している",
    "少し引用してから話を逸らす",
    "返信ではない、または親投稿がない",
  ],
  "popover.score": "スコア",
  "popover.powered": "open-compute で動作",
  "popover.true": "高いとき",
  "popover.false": "低いとき",
  "popover.overall": "総合",
  "popover.overall.high": "少なくとも1項目が明らかに高い",
  "popover.overall.mid": "不確かな項目がある",
  "popover.overall.low": "3項目とも低く、きれい",
  "state.loading": "判定中",
  "state.error": "判定に失敗",
  "state.empty": "判定できるテキストや画像がない",
};

const ko: Catalog = {
  "app.name": "Tweet 911",
  "options.intro":
    "확장 프로그램이 호출하는 Worker API를 설정하세요. api.typesafe.ai가 아니라 자신의 Cloudflare Worker를 지정하세요.",
  "options.apiBase": "API 기본 URL",
  "options.apiBase.hint":
    "끝 슬래시는 넣지 마세요. 배포 후 workers.dev 또는 커스텀 도메인을 넣습니다. 커스텀 도메인은 wxt.config.ts의 host_permissions에 추가해야 합니다.",
  "options.apiKey": "API 키(선택)",
  "options.apiKey.hint": "설정하면 Authorization: Bearer … 로 보냅니다.",
  "options.language": "언어",
  "options.language.auto": "자동(브라우저)",
  "options.language.zh": "简体中文",
  "options.language.zhHant": "繁體中文",
  "options.language.en": "English",
  "options.language.ja": "日本語",
  "options.language.ko": "한국어",
  "options.language.es": "Español",
  "options.save": "저장",
  "options.saved": "저장했습니다.",
  "options.source": "소스",
  "options.source.action": "GitHub에서 열기",
  "options.block": "필터",
  "options.block.off": "끄기",
  "options.block.blur": "흐리기",
  "options.block.hide": "숨기기",
  "options.block.hint":
    "흐리기는 내용을 가립니다. 「그래도 표시」로 잠시 벗길 수 있고, 새로고침하면 다시 가립니다. 숨기기는 타임라인에서 제거합니다.",
  "options.threshold": "차단 임계값",
  "options.threshold.post": "게시물 차단 임계값",
  "options.threshold.reply": "댓글 차단 임계값",
  "options.threshold.mid": "의심(노랑)",
  "options.threshold.high": "확정(빨강)",
  "popup.stats.total": "전체 검출",
  "popup.stats.today": "오늘 검출",
  "popup.stats.unit": "개",
  "veil.by": "Tweet 911이 감지",
  "veil.mid.ai": "AI 생성으로 의심",
  "veil.high.ai": "AI 생성으로 확정",
  "veil.mid.porn": "음란 유도로 의심",
  "veil.high.porn": "음란 유도로 확정",
  "veil.mid.para": "앵무새로 의심",
  "veil.high.para": "앵무새로 확정",
  "veil.restore": "그래도 표시",
  "metric.ai.name": "AI 맛",
  "metric.ai.short": "AI",
  "metric.ai.what": "이 글이 얼마나 대규모 모델처럼 읽히는지.",
  "metric.ai.high": "AI가 썼을 가능성이 큼",
  "metric.ai.mid": "아직 판단할 수 없음",
  "metric.ai.low": "사람이 썼을 가능성이 큼",
  "metric.ai.true": [
    "전형적인 ChatGPT 문장: X가 아니라 Y",
    "너무 정돈된 3단 구성, 대시, 공허한 유창함",
    "delve / leverage / paradigm 같은 상투어",
    "오타, 구어, 구체적인 개인 디테일이 없음",
  ],
  "metric.ai.false": [
    "오타, 구어, 중간에 끊긴 문장",
    "구체적인 경험, 입장, 내부 이야기",
    "불규칙한 리듬, 공유 맥락의 농담",
  ],
  "metric.porn.name": "음란 유도",
  "metric.porn.short": "NSFW",
  "metric.porn.what": "성적 유도, 만남 제안, 외부 유입인지.",
  "metric.porn.high": "음란 유도일 가능성이 큼",
  "metric.porn.mid": "아슬아슬하지만 아직 단정할 수 없음",
  "metric.porn.low": "유도로 보이지 않음",
  "metric.porn.true": [
    "오프라인 가능 / 프로필 보세요 / 너무 야함 같은 미끼 문구",
    "프로필이나 다른 앱으로 성적 콘텐츠를 유도",
    "아이디나 소개가 만남/성매매 광고",
    "댓글이 DM이나 만남을 위한 얇은 구실",
  ],
  "metric.porn.false": [
    "유도 없는 평범한 플러팅이나 데이트 농담",
    "업계 뉴스 이야기이지 호객이 아님",
    "약간 야한 사적 잡담",
  ],
  "metric.para.name": "앵무새",
  "metric.para.short": "반복",
  "metric.para.what": "원글을 말만 바꿔 되풀이한 댓글인지.",
  "metric.para.high": "바꿔 말하기 봇일 가능성이 큼",
  "metric.para.mid": "조금 반복적이지만 아직 단정할 수 없음",
  "metric.para.low": "반복으로 보이지 않음",
  "metric.para.true": [
    "원글 주장을 유의어로 반복",
    "새로운 의견, 사실, 농담, 질문이 없음",
    "좋아요를 위한 메아리",
  ],
  "metric.para.false": [
    "독자적인 견해, 경험, 농담, 질문을 보탬",
    "잠깐 인용한 뒤 다른 이야기로 감",
    "댓글이 아니거나 원글이 없음",
  ],
  "popover.score": "점수",
  "popover.powered": "open-compute로 구동",
  "popover.true": "높을 때",
  "popover.false": "낮을 때",
  "popover.overall": "종합",
  "popover.overall.high": "적어도 한 항목이 분명히 높음",
  "popover.overall.mid": "불확실한 항목이 있음",
  "popover.overall.low": "세 항목 모두 낮아 깨끗함",
  "state.loading": "채점 중",
  "state.error": "채점 실패",
  "state.empty": "채점할 텍스트나 이미지가 없음",
};

const es: Catalog = {
  "app.name": "Tweet 911",
  "options.intro":
    "Configura la API Worker que llama la extensión. No apuntes a api.typesafe.ai: usa tu Cloudflare Worker.",
  "options.apiBase": "URL base de la API",
  "options.apiBase.hint":
    "Sin barra final. Tras el deploy, pega tu URL workers.dev o un dominio propio. Los dominios propios van en host_permissions de wxt.config.ts.",
  "options.apiKey": "Clave API (opcional)",
  "options.apiKey.hint": "Si está, se envía como Authorization: Bearer …",
  "options.language": "Idioma",
  "options.language.auto": "Auto (navegador)",
  "options.language.zh": "简体中文",
  "options.language.zhHant": "繁體中文",
  "options.language.en": "English",
  "options.language.ja": "日本語",
  "options.language.ko": "한국어",
  "options.language.es": "Español",
  "options.save": "Guardar",
  "options.saved": "Guardado.",
  "options.source": "Código",
  "options.source.action": "Abrir en GitHub",
  "options.block": "Filtro",
  "options.block.off": "Off",
  "options.block.blur": "Difuminar",
  "options.block.hide": "Ocultar",
  "options.block.hint":
    "Difuminar cubre el contenido. «Mostrar igual» lo destapa hasta que recargues. Ocultar lo quita del timeline.",
  "options.threshold": "Umbral del filtro",
  "options.threshold.post": "Umbral de posts",
  "options.threshold.reply": "Umbral de respuestas",
  "options.threshold.mid": "Sospecha (amarillo)",
  "options.threshold.high": "Confirmado (rojo)",
  "popup.stats.total": "Total detectado",
  "popup.stats.today": "Hoy",
  "popup.stats.unit": "posts",
  "veil.by": "Detectado por Tweet 911",
  "veil.mid.ai": "Sospecha de texto generado por IA",
  "veil.high.ai": "IA confirmada",
  "veil.mid.porn": "Sospecha de captación sexual",
  "veil.high.porn": "Captación sexual confirmada",
  "veil.mid.para": "Sospecha de loro",
  "veil.high.para": "Loro confirmado",
  "veil.restore": "Mostrar igual",
  "metric.ai.name": "Sabor a IA",
  "metric.ai.short": "IA",
  "metric.ai.what": "Qué tanto parece escrito por un modelo grande.",
  "metric.ai.high": "Muy probablemente escrito por IA",
  "metric.ai.mid": "Inseguro: podría ser cualquiera",
  "metric.ai.low": "Muy probablemente humano",
  "metric.ai.true": [
    "Fórmulas típicas de ChatGPT: no es X, es Y",
    "Listas de tres, muchos guiones, pulido genérico",
    "Muletillas: delve, leverage, paradigm, tapestry",
    "Prosa fluida sin typos, jerga ni detalle personal",
  ],
  "metric.ai.false": [
    "Typos, jerga, frases a medias",
    "Anécdotas concretas, opiniones, detalle de insider",
    "Ritmo irregular, chistes de contexto compartido",
  ],
  "metric.porn.name": "Captación",
  "metric.porn.short": "NSFW",
  "metric.porn.what":
    "Si es cebo sexual, citas o tráfico a otra plataforma.",
  "metric.porn.high": "Muy probablemente captación sexual",
  "metric.porn.mid": "En el límite, aún no se puede afirmar",
  "metric.porn.low": "No parece captación",
  "metric.porn.true": [
    "Frases cebo: quedamos / mira el perfil / demasiado picante",
    "Dirige a un perfil u otra app por contenido sexual",
    "Usuario o bio anunciando encuentros o sexo de pago",
    "Comentarios que solo cubren un DM o una cita",
  ],
  "metric.porn.false": [
    "Coqueteo normal, sin embudo",
    "Noticias del sector, no captación",
    "Charla personal un poco sugerente",
  ],
  "metric.para.name": "Loro",
  "metric.para.short": "Eco",
  "metric.para.what":
    "Si la respuesta solo reformula el post padre con otras palabras.",
  "metric.para.high": "Muy probablemente un bot parafraseador",
  "metric.para.mid": "Algo repetitivo, aún no se puede afirmar",
  "metric.para.low": "No parece un loro",
  "metric.para.true": [
    "Repite la tesis del padre con sinónimos",
    "Sin opinión, dato, chiste ni pregunta nueva",
    "Eco para farmear likes",
  ],
  "metric.para.false": [
    "Añade una toma, historia, chiste o pregunta propia",
    "Cita poco y luego se desvía",
    "No es una respuesta, o no hay texto padre",
  ],
  "popover.score": "Puntuación",
  "popover.powered": "Impulsado por open-compute",
  "popover.true": "Alto cuando",
  "popover.false": "Bajo cuando",
  "popover.overall": "General",
  "popover.overall.high": "Al menos una señal está claramente alta",
  "popover.overall.mid": "Hay algo incierto",
  "popover.overall.low": "Las tres están bajas: se ve limpio",
  "state.loading": "Puntuando",
  "state.error": "Falló la puntuación",
  "state.empty": "No hay texto ni imágenes para puntuar",
};

const dict: Record<ResolvedLang, Catalog> = {
  zh,
  "zh-Hant": zhHant,
  en,
  ja,
  ko,
  es,
};

export type I18nKey = keyof typeof zh;

export const LANGUAGE_OPTIONS: {
  value: LanguageSetting;
  labelKey: I18nKey;
}[] = [
  { value: "auto", labelKey: "options.language.auto" },
  { value: "zh", labelKey: "options.language.zh" },
  { value: "zh-Hant", labelKey: "options.language.zhHant" },
  { value: "en", labelKey: "options.language.en" },
  { value: "ja", labelKey: "options.language.ja" },
  { value: "ko", labelKey: "options.language.ko" },
  { value: "es", labelKey: "options.language.es" },
];

const LOCALES: Record<ResolvedLang, string> = {
  zh: "zh-CN",
  "zh-Hant": "zh-TW",
  en: "en-US",
  ja: "ja-JP",
  ko: "ko-KR",
  es: "es",
};

let setting: LanguageSetting = "auto";
const listeners = new Set<() => void>();

export function browserLang(): ResolvedLang {
  const lang = (
    typeof navigator !== "undefined" ? navigator.language : "en"
  ).toLowerCase();
  if (lang.startsWith("zh")) {
    if (
      lang.includes("hant") ||
      lang.includes("-tw") ||
      lang.includes("-hk") ||
      lang.includes("-mo")
    ) {
      return "zh-Hant";
    }
    return "zh";
  }
  if (lang.startsWith("ja")) return "ja";
  if (lang.startsWith("ko")) return "ko";
  if (lang.startsWith("es")) return "es";
  return "en";
}

export function resolveLang(): ResolvedLang {
  return setting === "auto" ? browserLang() : setting;
}

export function localeTag() {
  return LOCALES[resolveLang()];
}

export function getLanguageSetting(): LanguageSetting {
  return setting;
}

const KNOWN_LANG = new Set<LanguageSetting>(
  LANGUAGE_OPTIONS.map((opt) => opt.value),
);

export function setLanguageSetting(next: LanguageSetting) {
  const resolved = KNOWN_LANG.has(next) ? next : "auto";
  if (setting === resolved) return;
  setting = resolved;
  for (const fn of listeners) fn();
}

export function subscribeI18n(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function t(key: I18nKey): string {
  const value = dict[resolveLang()][key];
  return typeof value === "string" ? value : value.join(" · ");
}

export function tList(key: I18nKey): readonly string[] {
  const value = dict[resolveLang()][key];
  return typeof value === "string" ? [value] : value;
}
