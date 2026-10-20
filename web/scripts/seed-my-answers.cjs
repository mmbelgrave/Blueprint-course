/*
 * Fill one live account with a finished course, to look at.
 *
 * Mwata asked to see the app with every page answered (20 October). This
 * writes Anna's answers — the made-up person in design/screenshots, the same
 * one the website samples come from — into a real account, so every screen,
 * every summary and every printed document has something in it.
 *
 * Anna is one person with one story: a Dutch bookkeeper who checks whether she
 * can have the life she wants in Amsterdam first, finds she cannot, and
 * decides to rent a house with land near Góis for a year. The pages her
 * fixture does not cover are written here in her voice, so nothing on screen
 * contradicts anything else.
 *
 *   node scripts/seed-my-answers.cjs mmbelgrave@hotmail.com
 *   node scripts/seed-my-answers.cjs mmbelgrave@hotmail.com --dry
 *
 * It refuses an account that already has answers unless you pass --replace,
 * and `node scripts/clear-my-answers.cjs <email>` takes it all out again.
 *
 * Run from web/, with .env.local in place.
 */
const fs = require("fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const os = require("node:os");

const [email, ...flags] = process.argv.slice(2);
const DRY = flags.includes("--dry");
const REPLACE = flags.includes("--replace");
if (!email) {
  console.error("usage: node scripts/seed-my-answers.cjs <email> [--dry] [--replace]");
  process.exit(1);
}

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")]; }),
);
const SB = env.NEXT_PUBLIC_SUPABASE_URL;
const SVC = env.SUPABASE_SERVICE_ROLE_KEY;
const admin = { apikey: SVC, authorization: `Bearer ${SVC}`, "content-type": "application/json" };
const rest = (p, init) => fetch(`${SB}/rest/v1/${p}`, { headers: admin, ...init });

/* Anna's fixture, made the same way the sample documents are. */
const annaPath = path.join(os.tmpdir(), `anna-${Date.now()}.json`);
execFileSync(process.execPath, [path.join(__dirname, "../../design/screenshots/example-answers.mjs"), annaPath]);
const anna = JSON.parse(fs.readFileSync(annaPath, "utf8"));
fs.unlinkSync(annaPath);

const row = (...cells) => Object.fromEntries(cells.map(([k, v]) => [k, String(v)]));
const table = (rows) => Object.fromEntries(rows.map((r, i) => [`r${i}`, r]));

/*
 * The pages the fixture does not carry, in Anna's voice.
 *
 * Two of them are the other road: Step 2's staying path (s2-s1 to s2-s7) is
 * the change she checked in Amsterdam before deciding to go, and Step 3's
 * Part 5 is the plan she would follow if the move fell through. A real person
 * usually fills one road or the other; both are here so every page has
 * something on it.
 */
const extra = {
  /* ---------------------------------------------------- Step 2, the move */
  "s2-0.1": {
    life_picture:
      "I want to wake with the light in a small house with land, and work three mornings a week at the bookkeeping I am good at. I want two hours outside every day and people close enough to eat with. I want to stop being afraid of January.",
    directions: "Renting a small house with land inland from Coimbra, around Góis or Arganil, for a year before buying anything.",
    must_haves: "Outside space of my own. Internet I can work on. A doctor within half an hour. A day's travel to my sister. Neighbours, not isolation. A town with a market.",
    dealbreakers: "Somewhere I cannot work because the internet drops. More than a day's travel from my sister. A place where I would need a car for every loaf of bread and never meet anybody.",
    willing_to_invest:
      "A year of savings, about €9,000 of the gap. Two months of packing and paperwork. Being the foreigner who speaks badly for the first year.",
    place_kind: ["Real seasons", "Countryside", "Small town nearby", "Near water"],
    top_three:
      "Real seasons, because I want spring to mean something. Countryside with a town ten minutes away, so I have neighbours and a market. Water nearby, a river is enough.",
  },
  "s2-1.3": {
    allowed:
      "I am Dutch, so Portugal is an EU country and I may live there. I register at the junta de freguesia within 90 days and ask for a NIF at finanças. Nobody has to give me permission.",
    prove: "An address, a NIF, proof of income or savings when I register, and health cover. Nothing I do not already have on paper.",
    afford:
      "A normal month comes to about €2,145 against €2,285 of work I already have. That is before any new client, and it leaves the reserve untouched.",
    find_out:
      "What the IRS actually costs on Dutch invoices in the first year (an accountant in Coimbra, €120 for the conversation), and whether my health insurance moves with me or has to be replaced.",
    deeper:
      "I asked two Dutch people who did it. Both said the paperwork is a morning, and the hard part is the first winter without anybody to call.",
  },
  "s2-2.3": {
    regions: ["Góis / Arganil", "Sertã", "Castelo de Vide", "Soure"],
    scores: table([
      row(["r1", "2"], ["r2", "1"], ["r3", "1"], ["r4", "2"]),
      row(["r1", "2"], ["r2", "1"], ["r3", "0"], ["r4", "1"]),
      row(["r1", "1"], ["r2", "2"], ["r3", "1"], ["r4", "1"]),
      row(["r1", "2"], ["r2", "1"], ["r3", "2"], ["r4", "1"]),
      row(["r1", "2"], ["r2", "1"], ["r3", "1"], ["r4", "0"]),
      row(["r1", "1"], ["r2", "2"], ["r3", "2"], ["r4", "1"]),
    ]),
  },
  "s2-3.2": {
    legal: table([
      row(["found", "EU citizen: I may live and work there. Registration at the junta within 90 days."], ["date", "3 March"]),
      row(["found", "NIF at finanças, free, same week. A fiscal representative is not needed for an EU citizen."], ["date", "3 March"]),
      row(["found", "Rental contracts are normally 12 months, two months' deposit, registered with finanças."], ["date", "10 March"]),
      row(["found", "Dutch invoices stay Dutch VAT; income tax moves after 183 days. Accountant says plan for about 22%."], ["date", "17 March"]),
      row(["found", "Health: EHIC for the first months, then register at the centro de saúde in Góis."], ["date", "17 March"]),
      row(["found", "The dog needs a pet passport and a rabies shot 21 days before travelling."], ["date", "24 March"]),
    ]),
  },
  "s2-3.4": {
    people: table([
      row(["who", "Marieke, Dutch, eight years near Arganil"], ["surprised", "How much the winter costs to heat a stone house"], ["confirmed", "Internet is fine on fibre, she works from home"], ["check", "Which villages have fibre and which do not"]),
      row(["who", "João, grew up in Góis, runs the café"], ["surprised", "That most houses with land are rented through people, not websites"], ["confirmed", "Rent around €700 to €800 for what I described"], ["check", "Ask him in March who has a house free in June"]),
      row(["who", "Sofie, Dutch, moved back after two years"], ["surprised", "She left because of isolation, not money"], ["confirmed", "A town within ten minutes is the thing that matters"], ["check", "Stay a week in winter before signing anything"]),
    ]),
  },
  "s2-4.1": {
    when: "The last week of January. If I love it in the wet and the dark, I will love it in May.",
    how_long: "Nine days",
    places: "Góis, Arganil, Sertã, and two afternoons in Coimbra for the hospital and the station.",
    travel: "Fly to Lisbon, train to Coimbra, a hire car for six days. No lifts from anybody who wants to sell me something.",
    stay: "A house with land outside Góis, through a neighbour rather than an agency, so I shop, cook and heat it myself.",
    budget: "€780, flights and car included",
    three_questions:
      "Can I work a normal week there, on their internet? Is the town close enough to meet somebody by accident? Does the dark get to me in the way it does in Amsterdam?",
  },
  "s2-4.2": {
    did: ["Did a normal food shop", "Drove to the hospital", "Used the local internet for a working day", "Walked the town on a wet weekday", "Sat in a café alone"],
    notes: table([
      row(["place", "Góis"], ["felt", "Small, awake, people said good morning"], ["measured", "Shop 4 min, doctor 9 min, Coimbra hospital 48 min"], ["score", "5"]),
      row(["place", "Arganil"], ["felt", "Bigger, more traffic, less mine"], ["measured", "Shop 6 min, doctor 12 min, hospital 41 min"], ["score", "4"]),
      row(["place", "Sertã"], ["felt", "Beautiful and far from everything"], ["measured", "Shop 9 min, doctor 15 min, hospital 70 min"], ["score", "3"]),
      row(["place", "The house outside Góis"], ["felt", "Quiet, cold in the morning, the river audible"], ["measured", "Fibre 92 Mbps up and down, two video calls held"], ["score", "5"]),
    ]),
  },
  "s2-5.2": {
    update:
      "Rent came back higher than I guessed: €780 is real for a house with land, but heating in January is €120 a month and I had €40. Food is cheaper than I thought, about €70 a week. The car costs the same as here. All together I am €65 a month worse than my Step 1 guess, and still €140 better than Amsterdam.",
  },
  /* The staying road, checked first. */
  "s2-s1": {
    change: "Three working days instead of five, in the same work, and a plot on the allotment list in Amsterdam Noord.",
    gives: "Two hours outside a day and mornings that are mine, without leaving my sister or my clients.",
    keep: "My three clients, the flat I know, Lotte twenty minutes away, the Tuesday market, my doctor.",
    still_hard: "The flat has no outside space and never will. January is grey here whatever my week looks like, and the rent keeps rising faster than my invoices.",
  },
  "s2-s2": {
    money: table([
      row(["now", "2285"], ["after", "1830"], ["certainty", "Estimate"]),
      row(["now", "2865"], ["after", "2865"], ["certainty", "Known"]),
      row(["now", "-580"], ["after", "-1035"], ["certainty", "Estimate"]),
      row(["now", "0"], ["after", "0"], ["certainty", "Known"]),
      row(["now", "14000"], ["after", "14000"], ["certainty", "Known"]),
    ]),
  },
  "s2-s3": {
    rules: table([
      row(["found", "I invoice, so nobody has to agree. Three days means saying no to Hendrik's Thursdays."], ["date", "2 February"]),
      row(["found", "The allotment list in Noord is four to six years long. I put my name down anyway."], ["date", "2 February"]),
      row(["found", "The lease forbids anything on the roof, and the balcony takes two pots."], ["date", "9 February"]),
      row(["found", "Health insurance and pension do not change; the pension simply gets less."], ["date", "9 February"]),
    ]),
  },
  "s2-s4": {
    week: table([
      row(["now", "40"], ["after", "24"], ["certainty", "Known"]),
      row(["now", "12"], ["after", "12"], ["certainty", "Known"]),
      row(["now", "9"], ["after", "20"], ["certainty", "Estimate"]),
      row(["now", "2"], ["after", "6"], ["certainty", "Estimate"]),
    ]),
  },
  "s2-s5": {
    people: table([
      row(["who", "Hendrik, my biggest client"], ["means", "No Thursdays, and the month-end moves to Wednesday"], ["needs", "To know a month ahead"], ["agreed", "Yes, from April"]),
      row(["who", "Lotte, my sister"], ["means", "I am here on a Friday instead of tired on a Sunday"], ["needs", "Nothing, she is glad"], ["agreed", "Yes"]),
      row(["who", "My landlord"], ["means", "Nothing changes"], ["needs", "Nothing"], ["agreed", "Not asked"]),
      row(["who", "The allotment association"], ["means", "A plot in four to six years"], ["needs", "€35 a year to stay on the list"], ["agreed", "On the list since February"]),
    ]),
  },
  "s2-s6": {
    test: "Four weeks of a three-day week, with Thursday and Friday outside whatever the weather.",
    how: "No client work on Thursday or Friday for four weeks. Two of those days at Lotte's allotment, two walking the Waterland dykes.",
    costs: "About €900 of invoices I did not send. Nothing else.",
    questions: "Do I use the days or lose them? Does the work still fit in three days? Is grey Amsterdam outside enough for me?",
    dates: "6 February to 6 March",
    confirmed:
      "The work does fit in three days, which surprised me. I used six of the eight days and did not miss the money as much as I feared.",
    changed:
      "Being outside in Amsterdam is not the same as having outside space. By the third Friday I was driving to somebody else's garden to feel it. That is the answer I did not want.",
    still_test: "Whether a year in the country actually holds my clients. That is the Portugal test, not this one.",
  },
  "s2-s7": {
    change: "Three working days instead of five, with the allotment list running in the background.",
    gives_keeps: "Mornings that are mine and two hours outside a day. I keep the clients, the flat, Lotte, the market and my doctor.",
    reasons:
      "It costs almost nothing to try. It keeps every person I care about within half an hour. And it proved the work fits in three days, which the move also needs.",
    not_give:
      "Outside space of my own, which is the first essential on my list. A plot is four to six years away and the balcony takes two pots.",
    money: "€1,830 a month against €2,865 of costs. That is €1,035 short every month, out of the €14,000.",
    rules: "Nobody has to agree: I invoice. The allotment list is four to six years and the lease forbids the roof.",
    hours: "About 9 hours a week are mine now. About 20 on three days.",
    people: "Hendrik agreed to lose Thursdays from April. Lotte is glad. The allotment wants €35 a year to keep my place on the list.",
    test: "Four weeks of three days: the work fitted, I used six of the eight free days, and I kept driving to somebody else's garden.",
    unknowns: "Whether a plot would come sooner through the smaller associations. Whether €1,035 a month of savings is a price I would pay for five years.",
    choice: "Look at a move after all",
    next_step: "Book the nine days in Portugal in the last week of January.",
    review_when: "In 6 weeks",
  },
  "s2-5.3": {
    really_want: "Outside space that is mine, every day, without asking anybody. Three days of work. People within reach.",
    change: "The three-day week stays. I keep my name on the allotment list and I say no to Thursdays from April.",
    protects_costs:
      "Staying protects Lotte, my clients and the doctor I trust. It costs me €1,035 a month out of savings for a life that still has no garden in it.",
    before_abroad: "Nothing. The test said the opposite: it is the move I have to look at properly, and now.",
    review: "In 6 weeks, after the Portugal trip",
  },
  /* ------------------------------------------------- Step 3, the decision */
  "s3-1.2": {
    papers: table([
      row(["applies", "Yes"], ["state", "EU citizen, no permit needed. Registration at the junta within 90 days."], ["how_long", "One morning"]),
      row(["applies", "Yes"], ["state", "NIF: free at finanças, same day."], ["how_long", "One morning"]),
      row(["applies", "Yes"], ["state", "Health: EHIC first, then the centro de saúde in Góis."], ["how_long", "Two weeks"]),
      row(["applies", "Yes"], ["state", "Tax: Dutch invoices stay Dutch VAT; income tax after 183 days, about 22%."], ["how_long", "Accountant booked for 14 April"]),
      row(["applies", "Yes"], ["state", "The dog: passport and a rabies shot 21 days before travelling."], ["how_long", "Three weeks"]),
      row(["applies", "No"], ["state", "No visa, no sponsor, no language exam."], ["how_long", "—"]),
    ]),
    papers_light: "Green",
    papers_green_by:
      "It is green: nothing here needs anybody's permission. The only date that matters is the dog's rabies shot, three weeks before the drive.",
  },
  "s3-1.3": {
    people: table([
      row(["who", "Lotte, my sister"], ["means", "She loses her Sunday walk with me"], ["needs", "Two visits a year and a bed when she comes"], ["stand", "With me, and says so"]),
      row(["who", "Hendrik, my biggest client"], ["means", "Nothing, if the internet holds"], ["needs", "A video call every Monday and the month-end on time"], ["stand", "Confirmed in writing in April"]),
      row(["who", "My mother"], ["means", "Her daughter is a flight away rather than a train"], ["needs", "To be told before anybody else, and a phone call on Sundays"], ["stand", "Worried, not against"]),
      row(["who", "Marieke, near Arganil"], ["means", "Somebody to call in the first winter"], ["needs", "Nothing"], ["stand", "Glad, and already offering help"]),
    ]),
    who_will_be_there:
      "Marieke is forty minutes away and João has the café in Góis. Lotte comes in September. I am not arriving at an empty map, but I am arriving alone.",
    people_light: "Amber",
    people_green_by:
      "Green when Lotte and I have the September dates in the calendar and my mother has heard it from me rather than from Lotte. Both before the end of May.",
  },
  "s3-4.3": {
    really_want: "A house with land, three working days, and to stop being afraid of January.",
    missing: "Nothing is missing for the year I am renting. What is missing is proof that two new clients will come, and that is not knowable from here.",
    before_again: "Not applicable: my answer is Go, for twelve months, with the flat kept and the reserve untouched.",
    meanwhile: "If the house falls through before June, I rent anything with land in the same valley for six months and look properly once I am there.",
    review: "End of May 2027",
  },
  /* Step 3's staying road: the plan she would follow if the move fell through. */
  "s3-5.1": {
    steps: table([
      row(["step", "Say no to Thursdays, in writing, with Hendrik"], ["first", "A month's notice"], ["how_long", "One conversation"], ["start_by", "1 April"]),
      row(["step", "Keep the three-day week going"], ["first", "The four-week test is finished"], ["how_long", "Ongoing"], ["start_by", "6 March"]),
      row(["step", "Stay on the allotment list, and join two smaller associations"], ["first", "€35 a year, each"], ["how_long", "An afternoon"], ["start_by", "15 April"]),
      row(["step", "Ask Lotte for one morning a week on her plot"], ["first", "Nothing"], ["how_long", "One conversation"], ["start_by", "10 April"]),
      row(["step", "Review whether the savings are worth it"], ["first", "Three months of real figures"], ["how_long", "An evening"], ["start_by", "30 June"]),
    ]),
  },
  "s3-5.2": {
    income_after: "€1,830 a month from April, three days a week, with the same clients.",
    costs_change: "Nothing starts. €35 a year for each allotment list, and the train to Lotte's plot.",
    buffer: "€8,000, untouched",
    conversation: "Hendrik, about Thursdays. One call, a month ahead, and in writing afterwards.",
    adviser_questions:
      "What three days a year does to my pension over ten years, and whether I can keep paying in voluntarily at the lower income.",
  },
  "s3-5.3": {
    my_choice_hours: "9 hours now, about 20 after",
    home_changes: "The balcony gets two large pots and a herb box. The spare corner becomes the desk, so the table is for eating again.",
    must_dos: "Month-end moves to Wednesday. I stop doing Hendrik's VAT returns, which were never mine, and hand them to his accountant.",
    blocks_back: "Thursday and Friday mornings, both of them outside before anything else happens.",
  },
  "s3-5.4": {
    who_i_tell: "Hendrik first, a month ahead. Lotte the same week. My mother before she hears it from Lotte.",
    what_i_need: "From Lotte: one morning a week on her plot until a list comes through, and no teasing about it.",
    who_already:
      "Marieke in Portugal, and Sofie who came back. I will ask Sofie what she would have done differently with the two years she spent away.",
  },
  "s3-5.5": {
    week_one: "Send Hendrik the written note about Thursdays, and spend the first free Thursday on the dyke rather than at home.",
    after_30: "Six of the eight free days used outside, and the work still finished on time.",
    after_90: "A plot or a share of one, the three-day week normal rather than an experiment, and the savings still above €12,000.",
    say_no_to: "Work that arrives on a Thursday, and the Sunday evening habit of opening the laptop to feel ready.",
  },
  "s3-5.6": { check_in_dates: "30 June 2027, and 1 April 2028" },
  change_plan: {
    the_change: "Three working days instead of five, from April, with the fourth and fifth day outside.",
    keep: "My three clients, the flat, Lotte twenty minutes away, the Tuesday market and my doctor.",
    in_place_date: "1 April 2027",
    small_test: "Four weeks of three days, with Thursday and Friday outside whatever the weather. Done: six of the eight days used.",
    first_three:
      "Tell Hendrik, in writing, a month ahead (1 April). Keep the three-day week running from the test (6 March). Join two smaller allotment associations (15 April).",
    income_buffer:
      "€1,830 a month against €2,865 of costs, so €1,035 out of savings each month. The €8,000 reserve stays untouched. About 20 hours a week become mine instead of 9.",
    who_i_tell: "Hendrik, a month ahead and in writing. Lotte the same week, and I ask for one morning on her plot. My mother before she hears it from Lotte.",
    first_90: "Week one: the note to Hendrik and a Thursday on the dyke. After 30 days: six of eight days outside. After 90: a plot or a share of one.",
    uncertain: "Whether a plot comes sooner through a smaller association, and what three days a year costs my pension over ten years.",
    plan_b: "If the savings drop below €12,000 before the autumn, I go back to four days and keep the Friday.",
    check_in_dates: "30 June 2027, and 1 April 2028",
  },
};

/* Every page of the three steps, so nothing is left "not started". */
const content = ["step1", "step2", "step3"].map((f) => require(`../src/content/${f}-content.json`));
const allPages = [];
for (const step of content) {
  for (const part of step.parts) {
    for (const e of [...(part.exercises ?? []), ...(part.summary ? [part.summary] : [])]) allPages.push(e.id);
  }
}

const answers = { ...anna.answers, ...extra };
const statuses = { ...anna.statuses };
/* The lesson videos and the exercise pages, all marked done. */
for (const step of content) {
  const n = step.step?.number ?? step.number;
  for (const part of step.parts) {
    statuses[`module:phase-1:step-${n}:${part.id}`] = "done";
    for (const e of [...(part.exercises ?? []), ...(part.summary ? [part.summary] : [])]) statuses[e.id] = "done";
  }
}
statuses["module:introduction"] = "done";

(async () => {
  const users = await (await fetch(`${SB}/auth/v1/admin/users?per_page=200`, { headers: admin })).json();
  const user = (users.users ?? users).find((u) => (u.email ?? "").toLowerCase() === email.toLowerCase());
  if (!user) return console.error(`no account for ${email}`);

  const written = Object.entries(answers).flatMap(([exerciseId, fields]) =>
    Object.entries(fields).map(([fieldId, value]) => ({
      user_id: user.id,
      exercise_id: exerciseId,
      field_id: fieldId,
      value,
      updated_at: new Date().toISOString(),
    })),
  );
  const marks = Object.entries(statuses).map(([exerciseId, status]) => ({
    user_id: user.id,
    exercise_id: exerciseId,
    status,
    updated_at: new Date().toISOString(),
  }));

  const filled = allPages.filter((id) => answers[id]).length;
  console.log(`${email}: ${Object.keys(answers).length} pages, ${written.length} answers, ${marks.length} marks.`);
  console.log(`${filled} of ${allPages.length} pages of the three steps have something on them.`);
  const empty = allPages.filter((id) => !answers[id]);
  if (empty.length) console.log(`no fields to fill, so nothing written: ${empty.join(", ")}`);
  if (DRY) return console.log("\n--dry: nothing was written.");

  const already = await (await rest(`answers?user_id=eq.${user.id}&select=exercise_id&limit=1`)).json();
  if (already.length && !REPLACE) {
    return console.error("that account already has answers. Pass --replace to write over them.");
  }

  for (const [label, table, rows] of [["answers", "answers", written], ["marks", "exercise_status", marks]]) {
    for (let i = 0; i < rows.length; i += 200) {
      const slice = rows.slice(i, i + 200);
      const res = await rest(table, {
        method: "POST",
        headers: { ...admin, prefer: "resolution=merge-duplicates" },
        body: JSON.stringify(slice),
      });
      if (!res.ok) return console.error(`${label} ${i}: ${res.status} ${(await res.text()).slice(0, 200)}`);
    }
    console.log(`${label}: written.`);
  }
  console.log("\nDone. `node scripts/clear-my-answers.cjs <email>` takes it all out again.");
})();
