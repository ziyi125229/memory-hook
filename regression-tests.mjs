import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = path.join(__dirname, "memory-plugin-demo.html");
const html = fs.readFileSync(htmlPath, "utf8");
const script = html.match(/<script>([\s\S]*)<\/script>/)[1];

const store = {};
globalThis.localStorage = {
  getItem: (k) => store[k] ?? null,
  setItem: (k, v) => {
    store[k] = String(v);
  },
};

const threadChildren = [];
function el(extra = {}) {
  return {
    addEventListener() {},
    innerHTML: "",
    textContent: "",
    value: "",
    style: {},
    disabled: false,
    classList: { add() {}, remove() {}, toggle() {} },
    title: "",
    scrollIntoView() {},
    closest() {
      return null;
    },
    appendChild(child) {
      threadChildren.push(child);
    },
    remove() {},
    parentNode: { removeChild() {} },
    focus() {},
    setSelectionRange() {},
    getAttribute() {
      return null;
    },
    ...extra,
  };
}
const els = {};
globalThis.document = {
  getElementById(id) {
    if (!els[id]) {
      els[id] = el(id === "thread" ? { children: threadChildren } : {});
      if (id === "thread") {
        els[id].appendChild = (child) => {
          threadChildren.push(child);
        };
      }
    }
    return els[id];
  },
  createElement(tag) {
    return el({ tagName: tag });
  },
};
globalThis.window = globalThis;
globalThis.SpeechRecognition = undefined;
globalThis.webkitSpeechRecognition = undefined;

eval(
  script +
    `\n;globalThis.MH = {
  parseMemories,
  retrieve,
  makeAnswer,
  buildExplain,
  composeQueryResponse,
  buildStateUpdateExplain,
  resolveStates,
  looksLikeQuery,
  clarifyCardHtml,
  captureAsk,
  appendUser,
  appendAi,
  enterVoiceDraft,
  cancelVoiceDraft,
  dismissVoiceDraft,
  getComposerText,
  ASK_IT,
  ASK_THING,
  get memories() { return memories; },
  get input() { return document.getElementById("memory"); },
  get voiceDraftActive() { return voiceDraftActive; },
  reset() {
    memories.length = 0;
    currentState = {};
    store["memory-hook-v16"] = JSON.stringify([]);
    threadChildren.length = 0;
    aiRepliedForTurn = false;
    voiceDraftActive = false;
    document.getElementById("memory").value = "";
  },
  record(text) {
    const list = parseMemories(text);
    list.forEach((memory) => memories.unshift(memory));
    resolveStates();
    return JSON.parse(JSON.stringify(list));
  },
  ask(q) {
    const r = retrieve(q);
    const composed = composeQueryResponse(r);
    return {
      answer: composed.answer || "",
      intent: r.intent,
      current: r.current,
      ambiguous: r.ambiguous || null,
      explain: composed.explain,
      isClarify: composed.isClarify,
    };
  },
};`
);

function wait() {
  const t = Date.now() + 3;
  while (Date.now() < t) {}
}
function has(a, e) {
  return String(a).replace(/\s/g, "").includes(String(e).replace(/\s/g, ""));
}
function count(re, s) {
  return (String(s).match(re) || []).length;
}

function run(id, inputs, query, check) {
  MH.reset();
  const parsed = [];
  for (const t of inputs) {
    parsed.push(...MH.record(t));
    wait();
  }
  const got = MH.ask(query);
  return { id, pass: check(got, parsed), answer: got.answer, parsed, current: got.current };
}

const results = [];

// ---------- V1.6.1 baseline (01-20) ----------
const baseline = [
  ["01", ["我的钥匙放在玄关柜上了。"], "我的钥匙在哪？", (g) => has(g.answer, "玄关柜")],
  [
    "02",
    ["我把红色钥匙放在客厅茶几下面第二个抽屉里了。"],
    "红色钥匙在哪？",
    (g) => has(g.answer, "第二个抽屉"),
  ],
  ["03", ["AirPods 放在卧室床头柜上。"], "我的耳机在哪？", (g) => has(g.answer, "床头柜")],
  [
    "04",
    ["我刚刚顺手把充电线扔书桌左边那个小盒子里了。"],
    "充电线在哪？",
    (g, p) => p[0].type !== "general" && has(g.answer, "小盒子"),
  ],
  [
    "05",
    ["我把它放到电视柜里面了。"],
    "刚才那个东西在哪？",
    (g, p) => p[0].uncertain && /不确定|哪件/.test(g.answer),
  ],
  [
    "06",
    ["钥匙放在茶几上。", "我把钥匙拿到玄关柜了。"],
    "我的钥匙在哪？",
    (g) => has(g.answer, "玄关柜") && !has(g.answer, "茶几"),
  ],
  [
    "07",
    ["钥匙在茶几。", "我把钥匙放到玄关柜。", "刚才又把钥匙放书桌上了。"],
    "我的钥匙在哪？",
    (g) => has(g.answer, "书桌"),
  ],
  [
    "08",
    ["钥匙放茶几。", "AirPods 放床头柜。", "钥匙后来放玄关柜。"],
    "我的 AirPods 在哪？",
    (g) => has(g.answer, "床头柜"),
  ],
  [
    "09",
    ["钥匙放在茶几。", "后来我把钥匙放玄关柜。"],
    "我的钥匙以前放在哪？",
    (g) => has(g.answer, "以前") && has(g.answer, "茶几"),
  ],
  ["10", ["我的充电宝借给小王了。"], "我的充电宝借给谁了？", (g) => has(g.answer, "小王")],
  [
    "11",
    ["充电宝放在书桌上。", "我把充电宝借给小王了。"],
    "充电宝现在在哪？",
    (g) => has(g.answer, "小王") && !has(g.answer, "书桌"),
  ],
  [
    "12",
    ["充电宝借给小王了。", "小王把充电宝还给我了，我放在书桌上。"],
    "充电宝现在在哪？",
    (g) => has(g.answer, "书桌"),
  ],
  [
    "13",
    ["钥匙和钱包都放在玄关柜上。"],
    "我的钱包在哪？",
    (g, p) => p.length === 2 && has(g.answer, "钱包") && has(g.answer, "玄关柜"),
  ],
  [
    "14",
    ["我的黑色 AirPods 放在卧室床头柜第二层。"],
    "黑色耳机在哪？",
    (g) => has(g.answer, "床头柜") && has(g.answer, "第二层"),
  ],
  [
    "15",
    ["黑色钥匙放玄关柜。", "银色钥匙放茶几。"],
    "银色钥匙在哪？",
    (g) => has(g.answer, "茶几") && !has(g.answer, "玄关柜"),
  ],
  ["16", ["我刚刚把钥匙放在玄关柜了。"], "我刚才把钥匙放哪了？", (g) => has(g.answer, "玄关柜")],
  [
    "17",
    ["昨天晚上我把身份证放在书桌抽屉里了。"],
    "我昨天把身份证放哪了？",
    (g) => has(g.answer, "书桌抽屉"),
  ],
  [
    "18",
    ["昨天钥匙放茶几。", "今天我把钥匙放玄关柜。"],
    "我的钥匙现在在哪？",
    (g) => has(g.answer, "玄关柜") && !has(g.answer, "茶几"),
  ],
  [
    "19",
    [
      "我刚回家，顺手把昨天买的那个白色充电宝放到了客厅电视柜最右边的第二个抽屉里面，免得明天出门的时候找不到。",
    ],
    "白色充电宝在哪？",
    (g, p) =>
      p[0].object === "白色充电宝" &&
      !(p[0].location.raw || "").includes("免得") &&
      has(g.answer, "电视柜"),
  ],
  [
    "20",
    ["那个东西应该还在我昨天放的地方。"],
    "那个东西在哪？",
    (g, p) => p[0].uncertain && /不确定|哪件|足够/.test(g.answer),
  ],
];
for (const c of baseline) results.push(run(...c));

// ---------- Possession Transfer ----------
results.push(
  run("P1-护照被妈妈拿走了", ["护照被妈妈拿走了"], "我的护照在哪？", (g, p) =>
    p[0].object === "护照" &&
    p[0].person === "妈妈" &&
    p[0].event === "possession_transfer" &&
    p[0].status === "with_person" &&
    has(g.answer, "妈妈那里") &&
    !has(g.answer, "借给")
  )
);
results.push(
  run("P2-妈妈拿走我的护照了", ["妈妈拿走我的护照了"], "我的护照在哪？", (g, p) =>
    p[0].object === "护照" &&
    p[0].person === "妈妈" &&
    p[0].event === "possession_transfer" &&
    has(g.answer, "妈妈那里")
  )
);
results.push(
  run("P3-小王把充电宝拿走了", ["小王把充电宝拿走了"], "充电宝现在在哪？", (g, p) =>
    p[0].object === "充电宝" &&
    p[0].person === "小王" &&
    p[0].event === "possession_transfer" &&
    p[0].status === "with_person" &&
    has(g.answer, "小王那里") &&
    !has(g.answer, "借给")
  )
);
results.push(
  run("P4-充电宝被小王拿走了", ["充电宝被小王拿走了"], "充电宝现在在哪？", (g, p) =>
    p[0].object === "充电宝" &&
    p[0].person === "小王" &&
    p[0].event === "possession_transfer" &&
    has(g.answer, "小王那里")
  )
);
results.push(
  run("P5-借给仍是lending", ["我把充电宝借给小王了"], "充电宝现在在哪？", (g, p) =>
    p[0].event === "lend" &&
    p[0].type === "lending" &&
    p[0].status === "lent" &&
    has(g.answer, "借给小王") &&
    !has(g.answer, "那里")
  )
);

// ---------- Voice Draft ----------
{
  MH.reset();
  const onresultBlock = script.slice(
    script.indexOf("recognition.onresult"),
    script.indexOf("recognition.onerror")
  );
  const noAutoSubmit =
    !/requestSubmit\(/.test(onresultBlock) && /enterVoiceDraft/.test(onresultBlock);
  results.push({
    id: "V1-语音不自动提交",
    pass: noAutoSubmit,
    answer: noAutoSubmit ? "draft only" : "autosubmit still present",
  });
}
{
  MH.reset();
  MH.enterVoiceDraft("护照被妈妈拿走了");
  const pass =
    MH.input.value === "护照被妈妈拿走了" && MH.voiceDraftActive === true && MH.memories.length === 0;
  results.push({
    id: "V2-识别进入Composer",
    pass,
    answer: pass ? MH.input.value : `value=${MH.input.value} draft=${MH.voiceDraftActive}`,
  });
}
{
  MH.reset();
  MH.enterVoiceDraft("护照被妈妈拿走了");
  MH.input.value = "我把钥匙放到玄关柜了"; // 用户修改
  const finalText = MH.getComposerText();
  const pass = finalText === "我把钥匙放到玄关柜了" && MH.memories.length === 0;
  results.push({
    id: "V3-最终发送用修改后文字",
    pass,
    answer: pass ? finalText : finalText,
  });
}
{
  MH.reset();
  const before = MH.memories.length;
  MH.enterVoiceDraft("护照被妈妈拿走了");
  // 重新录音语义：清空草稿、不写 Memory（不调用 record）
  MH.input.value = "";
  MH.dismissVoiceDraft();
  const pass = MH.memories.length === before && MH.memories.length === 0 && !MH.voiceDraftActive;
  results.push({
    id: "V4-重新录音不产生Memory",
    pass,
    answer: pass ? "no memory" : `mem=${MH.memories.length}`,
  });
}
{
  MH.reset();
  MH.enterVoiceDraft("错误识别内容");
  MH.cancelVoiceDraft();
  const pass =
    MH.memories.length === 0 && MH.input.value === "" && MH.voiceDraftActive === false;
  results.push({
    id: "V5-取消不产生Memory",
    pass,
    answer: pass ? "cancelled" : `mem=${MH.memories.length} value=${MH.input.value}`,
  });
}

// ---------- Clarify once ----------
{
  const clarifyHtml = MH.clarifyCardHtml(MH.ASK_THING);
  const askHits = count(/我还不确定你指的是哪件东西/g, clarifyHtml);
  const bubbleHits = count(/class="bubble"/g, clarifyHtml);
  const cardHits = count(/clarify-card/g, clarifyHtml);
  const pass = askHits === 1 && bubbleHits === 1 && cardHits === 1;
  results.push({
    id: "C1-Clarify模板不重复追问",
    pass,
    answer: pass ? "1 bubble + 1 card" : clarifyHtml,
  });
}
{
  MH.reset();
  threadChildren.length = 0;
  MH.appendUser("那个东西应该还在我昨天放的地方。");
  const html1 = MH.clarifyCardHtml(MH.captureAsk("那个东西应该还在我昨天放的地方。"));
  MH.appendAi(html1);
  const firstCount = threadChildren.filter((c) => c.className === "msg ai").length;
  // 模拟重复回调
  MH.appendAi(html1);
  const secondCount = threadChildren.filter((c) => c.className === "msg ai").length;
  const lastHtml = threadChildren.filter((c) => c.className === "msg ai").pop()?.innerHTML || "";
  const pass =
    firstCount === 1 &&
    secondCount === 1 &&
    count(/class="bubble"/g, lastHtml) === 1 &&
    count(/clarify-card/g, lastHtml) === 1;
results.push({
  id: "C2-同一回合Clarify只append一次",
  pass,
  answer: pass ? `aiMsgs=${secondCount}` : `aiMsgs=${secondCount} html=${lastHtml}`,
});
}

// ---------- Entity Resolution E1-E6 ----------
results.push(
  run(
    "E1-bare优先于红色钥匙",
    ["钥匙放茶几。", "我把钥匙拿到玄关柜了。", "红色钥匙在茶几底下。"],
    "我的钥匙在哪？",
    (g, p) =>
      has(g.answer, "玄关柜") &&
      !has(g.answer, "茶几底下") &&
      !has(g.answer, "红色钥匙") &&
      p.filter((m) => m.object === "钥匙").length >= 2 &&
      p.some((m) => m.object === "红色钥匙")
  )
);
results.push(
  run(
    "E2-红色钥匙精确命中",
    ["钥匙放茶几。", "我把钥匙拿到玄关柜了。", "红色钥匙在茶几底下。"],
    "红色钥匙在哪？",
    (g) => has(g.answer, "茶几底下") && has(g.answer, "红色钥匙")
  )
);
results.push(
  run(
    "E3-多属性消歧Clarify",
    ["黑色钥匙放书桌。", "红色钥匙放茶几。"],
    "钥匙在哪？",
    (g) =>
      has(g.answer, "多个可能的物品") &&
      has(g.answer, "避免答错") &&
      !has(g.answer, "现在在")
  )
);
results.push(
  run(
    "E4-车钥匙不覆盖钥匙",
    ["钥匙放玄关柜。", "车钥匙放卧室。"],
    "钥匙在哪？",
    (g) => has(g.answer, "玄关柜") && !has(g.answer, "卧室") && !has(g.answer, "车钥匙")
  )
);
results.push(
  run(
    "E5-属性精确命中",
    ["红色钥匙放茶几。", "黑色钥匙放书桌。"],
    "红色钥匙在哪？",
    (g) => has(g.answer, "茶几") && !has(g.answer, "书桌")
  )
);
results.push(
  run(
    "E6-历史不混入红色钥匙",
    ["钥匙放茶几。", "钥匙拿到玄关柜了。", "红色钥匙放书桌。"],
    "钥匙以前在哪？",
    (g) => has(g.answer, "以前") && has(g.answer, "茶几") && !has(g.answer, "书桌")
  )
);

// ---------- Explainability X1-X6 ----------
{
  MH.reset();
  for (const t of ["我把钥匙放茶几。", "我把钥匙拿到玄关柜了。"]) {
    MH.record(t);
    wait();
  }
  const g = MH.ask("我的钥匙在哪？");
  const x = g.explain || {};
  const pass =
    has(g.answer, "玄关柜") &&
    x.kind === "current" &&
    x.entity === "钥匙" &&
    has(x.currentState, "玄关柜") &&
    has(x.evidenceText, "玄关柜") &&
    has(x.reason, "最近一次有效");
  results.push({
    id: "X1-Current-Evidence",
    pass,
    answer: pass ? JSON.stringify(x) : `ans=${g.answer} explain=${JSON.stringify(x)}`,
  });
}
{
  MH.reset();
  for (const t of ["钥匙放茶几。", "我把钥匙拿到玄关柜了。"]) {
    MH.record(t);
    wait();
  }
  const before = JSON.parse(JSON.stringify(Object.values(MH.ask("noop").current || {})));
  void before;
  // State update explain from last capture path metadata
  const list = MH.record("钥匙放茶几。");
  wait();
  MH.record("我把钥匙拿到玄关柜了。");
  wait();
  // rebuild explain via compose on a synthetic prev/next from dump
  const dumpAsk = MH.ask("我的钥匙在哪？");
  const stateExplain = MH.buildStateUpdateExplain(
    { object: "钥匙", location: { raw: "茶几", hierarchy: ["茶几"], vague: false } },
    {
      object: "钥匙",
      location: { raw: "玄关柜", hierarchy: ["玄关柜"], vague: false },
      originalText: "我把钥匙拿到玄关柜了。",
    }
  );
  const pass =
    stateExplain &&
    stateExplain.kind === "state_update" &&
    has(stateExplain.currentState, "玄关柜") &&
    has(stateExplain.reason, "最近一次有效") &&
    has(stateExplain.note, "历史");
  results.push({
    id: "X2-State-Resolution-Reason",
    pass,
    answer: pass ? JSON.stringify(stateExplain) : JSON.stringify(stateExplain),
  });
  void dumpAsk;
  void list;
}
{
  MH.reset();
  for (const t of ["钥匙放茶几。", "我把钥匙拿到玄关柜了。"]) {
    MH.record(t);
    wait();
  }
  const g = MH.ask("钥匙以前在哪？");
  const x = g.explain || {};
  const pass =
    has(g.answer, "以前") &&
    has(g.answer, "茶几") &&
    x.kind === "history" &&
    has(x.reason, "历史") &&
    !has(x.reason || "", "最近一次有效的位置更新");
  results.push({
    id: "X3-History-Evidence",
    pass,
    answer: pass ? JSON.stringify(x) : `ans=${g.answer} explain=${JSON.stringify(x)}`,
  });
}
{
  MH.reset();
  for (const t of ["红色钥匙放茶几。", "黑色钥匙放书桌。"]) {
    MH.record(t);
    wait();
  }
  const g = MH.ask("我的钥匙在哪？");
  const x = g.explain || {};
  const html = MH.clarifyCardHtml(g.answer, x);
  const pass =
    g.isClarify &&
    x.kind === "ambiguous" &&
    has(g.answer, "多个可能的物品") &&
    has(x.reason, "多个可能的物品") &&
    /clarify-chip/.test(html) &&
    has(html, "红色钥匙") &&
    has(html, "黑色钥匙") &&
    !/clarify-reason/.test(html) &&
    !has(html, "你是指") &&
    !has(html, "baseObject") &&
    !has(html, "attrKey");
  results.push({
    id: "X4-Attribute-Clarify-Reason",
    pass,
    answer: pass ? g.answer : `ans=${g.answer} explain=${JSON.stringify(x)} html=${html}`,
  });
}
{
  MH.reset();
  const parsed = MH.record("我把它放电视柜里了。");
  const g = MH.ask("刚才那个东西在哪？");
  const x = g.explain || {};
  // 不确定：不编造当前位置/最近有效记录
  const pass =
    parsed[0].uncertain &&
    (!x || x.kind === "uncertain" || g.isClarify) &&
    !x.currentState &&
    !x.evidenceText &&
    !has(g.answer, "电视柜");
  results.push({
    id: "X5-Uncertainty-No-False-Explain",
    pass,
    answer: pass ? JSON.stringify(x) : `ans=${g.answer} explain=${JSON.stringify(x)}`,
  });
}
{
  MH.reset();
  for (const t of ["我把钥匙放茶几。", "我把钥匙拿到玄关柜了。"]) {
    MH.record(t);
    wait();
  }
  const g = MH.ask("我的钥匙在哪？");
  const pass =
    g.answer === "你的钥匙现在在玄关柜。" &&
    g.explain &&
    g.explain.kind === "current" &&
    g.explain.entity === "钥匙";
  results.push({
    id: "X6-Explain-Does-Not-Change-Answer",
    pass,
    answer: pass ? g.answer : `ans=${g.answer}`,
  });
}

results.forEach((c) => {
  console.log(c.id, c.pass ? "PASS" : "FAIL", c.answer || "");
  if (!c.pass && c.parsed) {
    console.log(
      "  parsed",
      JSON.stringify(
        c.parsed.map((m) => ({
          o: m.object,
          p: m.person,
          e: m.event,
          s: m.status,
          u: m.uncertain,
        }))
      )
    );
  }
});

const passed = results.filter((c) => c.pass).length;
const basePass = results.slice(0, 20).filter((c) => c.pass).length;
const newPass = results.slice(20).filter((c) => c.pass).length;
console.log("BASELINE", `${basePass}/20`);
console.log("NEW", `${newPass}/${results.length - 20}`);
console.log("COUNT", `${passed}/${results.length}`);
process.exit(passed === results.length ? 0 : 1);
