const fs = require("fs");
const p = "src/app/signup/page.tsx";
let s = fs.readFileSync(p, "utf8");
const NL = s.includes("\r\n") ? "\r\n" : "\n";
const rep = (a, b) => {
  const oldS = a.join(NL);
  if (!s.includes(oldS)) {
    console.error("NOT FOUND:\n" + oldS.slice(0, 120));
    process.exitCode = 1;
    return;
  }
  s = s.replace(oldS, b.join(NL));
};

// 1. Outer container: allow vertical scroll, center via margin auto
rep(
  [
    '    <div className="relative min-h-screen flex items-center justify-center bg-[var(--bg-main)] px-4">',
  ],
  [
    '    <div className="relative min-h-screen flex flex-col bg-[var(--bg-main)] px-4 py-8">',
  ]
);

// 2. Card: wider (max-w-lg), smaller padding on mobile, tighter spacing
rep(
  [
    '      <div className="relative w-full max-w-md rounded-2xl border border-[var(--border-glass)] bg-[var(--bg-card)] backdrop-blur-xl shadow-2xl p-6 space-y-6">',
  ],
  [
    '      <div className="relative m-auto w-full max-w-lg rounded-2xl border border-[var(--border-glass)] bg-[var(--bg-card)] backdrop-blur-xl shadow-2xl p-4 sm:p-6 space-y-4 sm:space-y-6">',
  ]
);

// 3. Header: smaller logo/heading on mobile
rep(
  [
    '            className="mx-auto h-12 w-auto max-w-[240px] object-contain"',
  ],
  [
    '            className="mx-auto h-10 w-auto max-w-[220px] object-contain sm:h-12 sm:max-w-[240px]"',
  ]
);
rep(
  [
    '          <h2 className="text-2xl font-semibold tracking-tight">',
  ],
  [
    '          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">',
  ]
);

// 4. Wrap signup inputs in spaced container
rep(
  [
    '        {step === "signup" && (',
    '          <>',
    '            <PremiumInput',
    '              label="Full name"',
  ],
  [
    '        {step === "signup" && (',
    '          <>',
    '            <div className="space-y-4">',
    '            <PremiumInput',
    '              label="Full name"',
  ]
);
rep(
  [
    '            <button',
    '              onClick={handleSignup}',
  ],
  [
    '            </div>',
    '',
    '            <button',
    '              onClick={handleSignup}',
  ]
);

// 5. Phone input: allow shrink on tiny screens
rep(
  [
    '                className="',
    '                  flex-1 rounded-lg border border-[var(--border-glass)]',
  ],
  [
    '                className="',
    '                  min-w-0 flex-1 rounded-lg border border-[var(--border-glass)]',
  ]
);

// 6. Fallback card: match new width/padding
rep(
  [
    '      <div className="relative w-full max-w-md rounded-2xl border border-[var(--border-glass)] bg-[var(--bg-card)] backdrop-blur-xl shadow-2xl p-6 space-y-4">',
  ],
  [
    '      <div className="relative m-auto w-full max-w-lg rounded-2xl border border-[var(--border-glass)] bg-[var(--bg-card)] backdrop-blur-xl shadow-2xl p-4 sm:p-6 space-y-4">',
  ]
);

if (!process.exitCode) {
  fs.writeFileSync(p, s);
  console.log("done");
}
