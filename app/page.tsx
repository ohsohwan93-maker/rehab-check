"use client";

import { useState } from "react";
import { supabase } from "./lib/supabaseClient";




export default function HomePage() {
  const [notes, setNotes] = useState("");
  const [monthlyTakeHome, setMonthlyTakeHome] = useState("");
  const [monthlyDebtPayment, setMonthlyDebtPayment] = useState("");
  const [totalDebt, setTotalDebt] = useState("");
  const [assetsValue, setAssetsValue] = useState("");
  const [step, setStep] = useState(1); // 1~4
const totalSteps = 4;
const [name, setName] = useState("");
const [birthDate, setBirthDate] = useState(""); // YYYY-MM-DD
const [region, setRegion] = useState("");



  const [result, setResult] = useState<{
  score: number;
  verdict: string;
  riskFlags: string[];
  explanation: string;
} | null>(null);

  const [checks, setChecks] = useState({
  gamblingLoss: false,      // 최근 1년 도박/코인/주식 과다손실
  fraudDebt: false,         // 사기/횡령/고의 불법 관련 채무 의심
  hiddenIncome: false,      // 소득 숨김/현금수입 미신고
  assetTransfer: false,     // 최근 재산을 가족/지인에게 넘김
  luxurySpending: false,    // 최근 사치/명품/유흥 과다지출
  tooManyLoans: false,      // 단기간 대출 급증(돌려막기)
  taxArrears: false,        // 국세/지방세 체납 큼
  noJobPlan: false,         // 소득이 없고 향후 계획도 없음
  unrealisticAssets: false, // 재산이 채무에 비해 너무 큼(회생 취지와 충돌 가능)
  recentBankruptcy: false,  // 최근 파산/면책 이력
});

  function toNumber(v: string) {
    const n = Number(v.replaceAll(",", "").trim());
    return Number.isFinite(n) ? n : 0;
  }

  function runDiagnosis() {
  const take = toNumber(monthlyTakeHome);
  const pay = toNumber(monthlyDebtPayment);
  const debt = toNumber(totalDebt);
  const assets = toNumber(assetsValue);

  let score = 0;
  const reasons: string[] = [];
  const riskFlags: string[] = [];

  // 1) 소득 대비 상환 부담
  const burden = pay / Math.max(take, 1);
  if (burden >= 0.5) {
    score += 30;
    reasons.push("월 소득 대비 상환 부담이 매우 큼(50% 이상)");
  } else if (burden >= 0.3) {
    score += 20;
    reasons.push("월 소득 대비 상환 부담이 큼(30% 이상)");
  } else if (burden >= 0.15) {
    score += 10;
    reasons.push("월 소득 대비 상환 부담이 어느 정도 있음(15% 이상)");
  } else {
    reasons.push("월 소득 대비 상환 부담이 낮은 편");
  }

  // 2) 총 채무 규모
  if (debt >= 50000000) {
    score += 25;
    reasons.push("총 채무 규모가 큰 편(5천만 이상)");
  } else if (debt >= 20000000) {
    score += 15;
    reasons.push("총 채무 규모가 중간 이상(2천만 이상)");
  } else if (debt >= 10000000) {
    score += 8;
    reasons.push("총 채무 규모가 있음(1천만 이상)");
  } else {
    reasons.push("총 채무 규모가 비교적 적은 편");
  }

  // 3) 재산 vs 채무 (단순 체크)
  if (assets >= debt && debt > 0) {
    score -= 25;
    riskFlags.push("재산이 채무보다 많거나 비슷함 → 회생 필요성 설명이 중요");
  } else if (assets >= debt * 0.6 && debt > 0) {
    score -= 15;
    riskFlags.push("재산이 채무 대비 높은 편 → 재산/변제계획 설명 필요");
  }

  // 4) 위험요소 체크(감점)
  const riskPenaltyMap: Array<[keyof typeof checks, number, string]> = [
    ["gamblingLoss", -18, "최근 1년 도박/코인/주식 과다손실 이력"],
    ["fraudDebt", -30, "사기/횡령/고의 불법 관련 채무 의심(매우 위험)"],
    ["hiddenIncome", -25, "소득 숨김/현금수입 미신고 가능성(매우 위험)"],
    ["assetTransfer", -25, "최근 재산을 가족/지인에게 이전(매우 위험)"],
    ["luxurySpending", -12, "최근 사치/유흥 과다지출"],
    ["tooManyLoans", -10, "단기간 대출 급증/돌려막기 패턴"],
    ["taxArrears", -10, "세금 체납이 큼(별도 설명 필요)"],
    ["noJobPlan", -12, "현재 소득이 없고 향후 계획이 불명확"],
    ["unrealisticAssets", -15, "재산이 많은 편(회생 취지 충돌 가능)"],
    ["recentBankruptcy", -20, "최근 파산/면책 이력(재신청 제한 가능)"],
  ];

  for (const [k, p, msg] of riskPenaltyMap) {
    if (checks[k]) {
      score += p;
      riskFlags.push(msg);
    }
  }

  // 5) 판정
  let verdict = "낮음";
  if (score >= 35) verdict = "가능성 높음";
  else if (score >= 20) verdict = "보통";

  // 6) 설명 문장 만들기
  const explanation =
    `판정 근거: ${reasons.join(" / ")}.` +
    (riskFlags.length ? `  주의(불리 요소): ${riskFlags.join(", ")}.` : "  큰 불리 요소 체크는 없음.");

  setResult({ score, verdict, riskFlags, explanation });
}

async function saveResult() {
  if (!result) {
    alert("먼저 진단하기를 눌러 결과를 만든 뒤 저장해줘!");
    return;
  }

  const payload = {
    name: name.trim(),
  birth_date: birthDate,
  region: region.trim(),
    answers: checks,
     notes: notes.trim(),
risk_flags: result.riskFlags,
explanation: result.explanation,
    monthly_take_home: toNumber(monthlyTakeHome),
    monthly_debt_payment: toNumber(monthlyDebtPayment),
    total_debt: toNumber(totalDebt),
    assets_value: toNumber(assetsValue),
    score: result.score,
    verdict: result.verdict,
  };

  const { error } = await supabase.from("diagnosis_results").insert(payload);

  if (error) alert("저장 실패: " + error.message);
  else alert("저장 완료!");
}

  return (
    <main style={{ maxWidth: 720,
    margin: "40px auto",
    padding: 24,
    fontFamily: "system-ui",
    backgroundColor: "#c3c9b3ec",
    borderRadius: 20,color: "#031313" }}>
      <h1 style={{ fontSize: 28, fontWeight: 800 }}>저스티스쉴드 상담표</h1>
      <div style={{ marginTop: 16 }}>
  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, opacity: 0.8 }}>
    <span>{step} / {totalSteps} 단계</span>
    <span>{Math.round((step / totalSteps) * 100)}%</span>
  </div>

  <div style={{ height: 10, background: "#E7F3EC", borderRadius: 999, marginTop: 8 }}>
    <div
      style={{
        height: 10,
        width: `${(step / totalSteps) * 100}%`,
        background: "#6BCF9D",
        borderRadius: 999,
        transition: "width 0.2s ease",
      }}
    />
  </div>
</div>

  <div style={{ marginTop: 24, fontSize: 12, opacity: 0.6 }}>
    ※ 본 자가진단 결과는 참고용이며, 실제 개인회생 가능 여부는 법원 및 전문가 판단에 따라 달라질 수 있습니다.
  </div>


      <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
        <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
  <button
    onClick={() => setStep((s) => Math.max(1, s - 1))}
    style={{ ...btnStyle, backgroundColor: "#ffffff", color: "#2F4F4F", border: "1px solid #CDE9DD" }}
    disabled={step === 1}
  >
    이전
  </button>

  {step < 4 ? (
    <button
      onClick={() => {
        if (step === 1) {
          if (!name.trim() || !birthDate || !region.trim()) {
            alert("이름/생년월일/거주지역은 필수입니다");
            return;
          }
        }
        setStep((s) => Math.min(4, s + 1));
      }}
      style={btnStyle}
    >
      다음
    </button>
  ) : (
    <>
      <button onClick={runDiagnosis} style={btnStyle}>
        진단하기
      </button>

      <button
        onClick={saveResult}
        style={{
          ...btnStyle,
          opacity: result ? 1 : 0.5,
          cursor: result ? "pointer" : "not-allowed",
        }}
        disabled={!result}
      >
        결과 저장
      </button>
    </>
  )}
</div>

  <button
    onClick={() => setStep((s) => Math.max(1, s - 1))}
    style={{ ...btnStyle, backgroundColor: "#ffffff", color: "#2F4F4F", border: "1px solid #CDE9DD" }}
    disabled={step === 1}
  >
    이전
  </button>

  {step < 4 ? (
    <button
      onClick={() => {
        
         if (step === 1) {
    if (!name.trim() || !birthDate || !region.trim()) {
      alert("이름/생년월일/거주지역은 필수입니다");
      return;
    }
  }
        
        setStep((s) => Math.min(4, s + 1));
      }}
      style={btnStyle}
    >
      다음
    </button>
  ) : (
    <button onClick={saveResult} style={btnStyle}>
      결과 저장
    </button>
  )}
</div>

        {step === 1 && (
  <>
   <label>
      이름
      <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
    </label>

    <label>
      생년월일
      <input
        type="date"
        value={birthDate}
        onChange={(e) => setBirthDate(e.target.value)}
        style={inputStyle}
      />
    </label>

    <label>
      거주지역(예: 인천/부평구 등)
      <input value={region} onChange={(e) => setRegion(e.target.value)} style={inputStyle} />
    </label>

        <label>
          월 실수령(원)
          <input value={monthlyTakeHome} onChange={(e) => setMonthlyTakeHome(e.target.value)} style={inputStyle} />
        </label>

        <label>
          월 채무 상환액(원)
          <input value={monthlyDebtPayment} onChange={(e) => setMonthlyDebtPayment(e.target.value)} style={inputStyle} />
        </label>
 </>
)}
{step === 2 && (
  <>
        <label>
          총 채무(원)
          <input value={totalDebt} onChange={(e) => setTotalDebt(e.target.value)} style={inputStyle} />
        </label>

        <label>
          재산(부동산/차/예금적금/보험해약금/주식 등) 대략 (원)
          <input value={assetsValue} onChange={(e) => setAssetsValue(e.target.value)} style={inputStyle} />
        </label>
        </>
)}

{step === 3 && (
  <div style={{ padding: 16, background: "#ffffff", borderRadius: 16 }}>
    <div style={{ fontWeight: 700, marginBottom: 8 }}>최근/주의 사항 체크(해당되면 체크)</div>

    {[
      ["gamblingLoss", "최근 1년 도박/코인/주식으로 큰 손실이 있었다"],
      ["fraudDebt", "사기/횡령/고의 불법 관련 채무가 있다(또는 의심된다)"],
      ["hiddenIncome", "현금수입 등 소득 신고가 불완전할 수 있다"],
      ["assetTransfer", "최근 재산을 가족/지인에게 넘겼다(명의이전/증여 등)"],
      ["luxurySpending", "최근 사치/명품/유흥 지출이 많았다"],
      ["tooManyLoans", "단기간 대출이 급격히 늘었다(돌려막기 포함)"],
      ["taxArrears", "국세/지방세 체납이 크다"],
      ["noJobPlan", "현재 소득이 없고 앞으로 소득 계획도 불확실하다"],
      ["unrealisticAssets", "재산이 채무에 비해 꽤 많다고 느낀다"],
      ["recentBankruptcy", "최근 파산/면책 이력이 있다"],
    ].map(([key, label]) => (
      <label key={key} style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 0" }}>
        <input
          type="checkbox"
          checked={(checks as any)[key]}
          onChange={(e) => setChecks((prev) => ({ ...prev, [key]: e.target.checked }))}
        />
        <span>{label}</span>
      </label>
    ))}
  </div>
)}


   


        {step === 4 && result && (
             
  <div style={{ padding: 20, backgroundColor: "#FFFFFF", borderRadius: 16 }}>
     <div style={{ fontWeight: 700, marginBottom: 8 }}>특이사항(메모)</div>
    <textarea
      value={notes}
      onChange={(e) => setNotes(e.target.value)}
      placeholder="예) 최근 실직/병원비, 부양가족, 체납 사유, 급여 변동, 보유 차량 상세, 기타 설명 등"
      style={{ ...inputStyle, minHeight: 110, resize: "vertical" }}
    />
    <div style={{ marginTop: 6, fontSize: 12, opacity: 0.6 }}>
      저장 전 참고용 메모야. (선택 입력)
    </div>
    <div style={{ fontSize: 18, fontWeight: 700 }}>진단 결과: {result.verdict}</div>
    <div style={{ opacity: 0.8 }}>점수: {result.score}</div>
    <p style={{ marginTop: 10, opacity: 0.9 }}>{result.explanation}</p>
  </div>
)}

      </div>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: 10,
  marginTop: 6,
  border: "1px solid #ccc",
  borderRadius: 10,
};

const btnStyle: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #333",
  cursor: "pointer",
};
