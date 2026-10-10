/*
 * Example answers for the landing-page screenshots. One invented person, Anna,
 * answering Step 1 honestly: not a perfect life, a real decision with a gap in
 * it. The numbers are consistent all the way through to the money check, so the
 * calculated lines and the Blueprint show real figures rather than dashes.
 */
import { writeFileSync } from "node:fs";

const row = (...cells) => Object.fromEntries(cells.map(([k, v]) => [k, String(v)]));
const table = (rows) => Object.fromEntries(rows.map((r, i) => [`r${i}`, r]));

const answers = {
  "0.1": {
    moment:
      "Last September, on the terrace of a rented house near Góis. Bread, cheese, the dog asleep. I had not looked at my phone since breakfast and nobody needed anything from me.",
    normal_day:
      "Wake without an alarm. Two hours of work that is actually mine. Lunch outside. An afternoon in the garden, hands dirty. Someone to eat with in the evening.",
    keep: "My three regular clients, my sister close enough to visit, Dutch directness, my morning coffee ritual.",
    big_question: "Can I really live on less, or am I only telling myself a nice story?",
  },
  "1.0": {
    no_to_yes: table([
      row(["no", "Being in a car at 7:10 every morning"], ["yes", "Work that starts when I am ready for it"]),
      row(["no", "A diary somebody else fills in"], ["yes", "Three days a week I decide myself"]),
      row(["no", "A flat with no outside space"], ["yes", "A garden I can walk into barefoot"]),
      row(["no", "Being tired by Wednesday"], ["yes", "Energy left over on a normal day"]),
    ]),
  },
  "1.1": {
    moments: [
      "Picking figs from the tree behind the rented house, September.",
      "A whole Saturday building raised beds with my brother-in-law.",
      "Finishing a client's year-end on my own clock, at my own table.",
      "Walking down to the river at six in the morning, nobody about.",
      "Cooking for eight people who stayed until midnight.",
    ],
    common:
      "I was outside, my hands were busy, and nobody was waiting for me. The good moments are never about buying something. They are about time that belongs to me, and people in it who chose to be there.",
  },
  "1.2": {
    day:
      "I wake up with the light, not an alarm. Coffee on the step while the valley is still cool. Two or three hours of bookkeeping at the kitchen table, the work I am genuinely good at, done properly and then finished. Lunch outside. The afternoon in the garden or fixing something that needs fixing. Around five I walk down to the village for bread and say hello to people who know my name. In the evening someone eats with me, or I read until I fall asleep. Nothing in the day is urgent.",
    needs:
      "Underneath it: quiet, daylight, and being the one who decides what happens next. Also being useful to someone. I thought I wanted a different country. What I want is a different owner of my hours.",
    deeper:
      "The part I keep avoiding: in that picture I am alone quite a lot. I need to be honest that I want company in it, not only peace.",
  },
  "1.3": {
    dream_list:
      "A small stone house with land. A proper kitchen. Travel three times a year to see people I love. A year of not worrying about January. Pay off my sister's loan. Learn Portuguese properly, with a teacher. A greenhouse. Time to be ill without it costing me money.",
    top3: [
      "A house with land, even a small one",
      "Not being afraid of a bad month",
      "Time I do not have to account for to anyone",
    ],
    deeper:
      "Two of my three do not need much money. They need lower costs and a decision. That is uncomfortable, because it means I could have started already.",
  },
  "1.4": {
    values: ["Freedom", "Nature", "Peace of mind", "Health", "Family", "Simplicity", "Independence"],
    top_two: table([
      row(["word", "Freedom"], ["week", "Three working days I plan myself, and no Sunday evening dread."]),
      row(["word", "Nature"], ["week", "Outside for two hours a day without having to drive somewhere first."]),
    ]),
    must_haves: table([
      row(["must_have", "Outside space of my own"], ["importance", "Essential"]),
      row(["must_have", "Fast, reliable internet"], ["importance", "Essential"]),
      row(["must_have", "A doctor within 30 minutes"], ["importance", "Essential"]),
      row(["must_have", "Reachable from the Netherlands in a day"], ["importance", "Essential"]),
      row(["must_have", "Neighbours, not isolation"], ["importance", "Strongly preferred"]),
      row(["must_have", "A town with a market"], ["importance", "Strongly preferred"]),
    ]),
    dealbreakers:
      "Somewhere I cannot work because the internet drops. Being more than a day's travel from my sister. A place where I would be the only person for a kilometre.",
    keep: "My three clients. My sister. My morning hour. Being able to say exactly what I think.",
    let_go: "The car. The storage unit. Half my clothes. The idea that leaving means I failed at staying.",
  },
  "1.5": {
    checks: {
      "This picture is mine, not borrowed": "Yes",
      "I would still want it if nobody ever saw it": "Yes",
      "It fits who I am, not who I think I should be": "Partly",
      "The people in it have agreed to be in it": "Not sure",
    },
    voices:
      "My father is in this more than I admitted. He always said land is the only thing worth owning. The garden is mine; the word land is his. And the guest room is partly me proving the move pays for itself, which is really my fear of being judged.",
  },
  "2.1": {
    wheel: table([
      row(["today", "5"], ["year", "8"], ["week", "I sit for nine hours and walk the dog twice."], ["better", "Two hours outside a day and a body that is tired for a good reason."]),
      row(["today", "6"], ["year", "7"], ["week", "Enough comes in, but January always frightens me."], ["better", "Three months of costs put aside and not touched."]),
      row(["today", "5"], ["year", "8"], ["week", "Work I can do well, in a place I do not want to be."], ["better", "The same work, my own hours, fewer clients, done properly."]),
      row(["today", "4"], ["year", "7"], ["week", "Nobody to tell about my day."], ["better", "Someone in the evenings, even if not every evening."]),
      row(["today", "7"], ["year", "8"], ["week", "My sister weekly, friends every few weeks."], ["better", "Fewer people, seen for longer."]),
      row(["today", "4"], ["year", "8"], ["week", "I am too tired to do anything I planned."], ["better", "One real day a week that is mine."]),
      row(["today", "5"], ["year", "7"], ["week", "I read about the life instead of building it."], ["better", "Portuguese lessons, and one skill learned with my hands."]),
      row(["today", "3"], ["year", "9"], ["week", "A flat with a balcony I never sit on."], ["better", "A door I open onto my own ground."]),
    ]),
    time: table([
      row(["now", "45"], ["want", "25"]),
      row(["now", "14"], ["want", "10"]),
      row(["now", "8"], ["want", "14"]),
      row(["now", "4"], ["want", "12"]),
      row(["now", "3"], ["want", "8"]),
      row(["now", "10"], ["want", "3"]),
    ]),
    most_time_back:
      "The commute and the hours I give to screens because I am too tired to choose anything better. That is nearly fifteen hours a week, and none of it is work.",
    decides: table([
      row(["now", "52"], ["want", "30"]),
      row(["now", "28"], ["want", "22"]),
      row(["now", "32"], ["want", "60"]),
    ]),
    savings: {},
    drop:
      "The storage unit (sell or give away). The weekly supermarket drive (order it). Two of the five client meetings that could be an email. Ironing.",
    fixed_block:
      "Thursday at the office. The work is already done remotely; I go because it is in the diary. I can ask to drop it.",
    take_back:
      "Thursday. I will ask in the next two weeks to make it a home day, and use the morning for the house search instead of the evening.",
    deeper:
      "I keep saying I have no time. Looking at it written down, I have about fifteen hours. I have been spending them on being tired.",
  },
  "2.2": {
    successes: table([
      row(["achieved", "Built my bookkeeping practice to three steady clients while working four days"], ["how", "One client at a time, never promising more than I could do"], ["reuse", "Patience, and work that speaks for itself"]),
      row(["achieved", "Stopped drinking for a year after my father died"], ["how", "Told two people, so it was not a secret I could break quietly"], ["reuse", "I keep promises I have said out loud"]),
      row(["achieved", "Learned enough Portuguese in six months to do my own paperwork"], ["how", "Twenty minutes every morning, no exceptions"], ["reuse", "Small and daily beats big and occasional"]),
    ]),
    dots: table([
      row(["turning_point", "Being made redundant at 31"], ["started", "Going self-employed, which I would never have chosen"], ["about_me", "I only move when I am pushed. Worth knowing."]),
      row(["turning_point", "My father's death"], ["started", "Asking what I am actually doing with the years"], ["about_me", "I do not want to find out at 70 that I waited."]),
      row(["turning_point", "Two weeks near Góis last September"], ["started", "This whole question"], ["about_me", "I knew within three days. The body decided before the spreadsheet."]),
    ]),
    deeper:
      "Every real change in my life was forced on me. Nobody is going to force this one. That is the actual difficulty, not the money.",
  },
  "2.3": {
    causes: [
      "Something I can influence over time (money, work, health, people)",
      "Not enough support or information",
      "Doubt or fear",
    ],
    before:
      "In 2019 I nearly did this. I got as far as a viewing trip and then my mother was ill, and afterwards I never picked it back up. I told myself it was the wrong moment for four years.",
    differently:
      "Last time I did it alone and in secret, so it was easy to let go quietly. This time my sister knows, and there is a date in my diary.",
    deeper:
      "The fear is not of Portugal. It is of coming back in two years having to explain it to people who said I was romantic.",
  },
  "2.4": {
    beliefs: table([
      row(["belief", "I am too old to start again at 44"], ["kind", "Holds me back"], ["check", "Find three people who moved after 40 and ask them what the real cost was"]),
      row(["belief", "You need €200,000 or it is not responsible"], ["kind", "Holds me back"], ["check", "Finish the money check in Part 3 and look at the actual number"]),
      row(["belief", "Life there is simply cheaper, so it will work out"], ["kind", "Sounds attractive"], ["check", "Ask two people living there for their real monthly figures, not the blogs"]),
      row(["belief", "If I go, I lose my clients"], ["kind", "Holds me back"], ["check", "Ask my three clients directly whether my address matters to them"]),
    ]),
    deeper:
      "Two of these I have believed for years without once checking. The €200,000 figure came from a man at a party in 2018.",
  },
  "2.5": {
    surprised:
      "My sister said: you have been happiest in the years you had least money. My oldest client said he had assumed I would have gone already, and that he does not care where I sit as long as the work arrives. I had been carrying that worry for two years for nothing.",
  },
  "3.1": {
    words: ["Safety", "Freedom", "Proof", "January", "Not asking anyone"],
    what_helps:
      "Money helps me most when it buys quiet, not things. Three months of costs in the bank changes how I sleep more than a better car ever did. What I actually want from money is the right to say no.",
  },
  "3.2": {
    costs: table([
      row(["today", "1450"], ["new_life", "780"], ["certainty", "Estimate"]),
      row(["today", "210"], ["new_life", "130"], ["certainty", "Estimate"]),
      row(["today", "520"], ["new_life", "420"], ["certainty", "Estimate"]),
      row(["today", "310"], ["new_life", "180"], ["certainty", "Estimate"]),
      row(["today", "190"], ["new_life", "165"], ["certainty", "Known"]),
      row(["today", "85"], ["new_life", "70"], ["certainty", "Known"]),
      row(["today", "180"], ["new_life", "140"], ["certainty", "Estimate"]),
      row(["today", "90"], ["new_life", "180"], ["certainty", "Estimate"]),
      row(["today", "0"], ["new_life", "0"], ["certainty", "Known"]),
      row(["today", "0"], ["new_life", "0"], ["certainty", "Known"]),
      row(["today", "145"], ["new_life", "120"], ["certainty", "Estimate"]),
      row(["today", "60"], ["new_life", "60"], ["certainty", "Estimate"]),
    ]),
  },
  "3.3": {
    one_time: table([
      row(["amount", "3200"], ["certainty", "Estimate"]),
      row(["amount", "900"], ["certainty", "Estimate"]),
      row(["amount", "4500"], ["certainty", "Estimate"]),
      row(["amount", "1600"], ["certainty", "Estimate"]),
      row(["amount", "800"], ["certainty", "Estimate"]),
    ]),
  },
  "3.4": {
    income: table([
      row(["source", "Bookkeeping, my three regular clients"], ["now", "1650"], ["new_life", "1650"], ["certainty", "Confirmed"], ["starts", "Already running"]),
      row(["source", "Part-time salary at the office"], ["now", "1250"], ["new_life", "0"], ["certainty", "Confirmed"], ["starts", "Ends when I leave"]),
      row(["source", "Two new remote clients"], ["now", "0"], ["new_life", "700"], ["certainty", "Hoped"], ["starts", "From month 4"]),
      row(["source", "One guest room, part of the year"], ["now", "0"], ["new_life", "350"], ["certainty", "Hoped"], ["starts", "From month 9"]),
    ]),
  },
  "3.5": {
    savings: { savings: "42000", deposits: "2300", reserve: "8000" },
    deeper:
      "The honest line is this: what is confirmed does not cover my new life. I am about €595 short every month until the new clients start, and my savings cover that gap for about three years. So this is not a leap. It is a runway, and I can see the end of it, which means I will work.",
    hours_for_fixed:
      "About 62 hours a month go to fixed costs today. In the new life it is roughly 38. Twenty-four hours a month bought back.",
    income_fixed_place:
      "Only the office salary is tied to a place, and that is the part I am giving up. The bookkeeping has never cared where I sit.",
  },
  "4.1": {
    options: table([
      row(["option", "Rent a small house with land near Góis for a year"], ["not_sure", "Whether winter there is bearable alone"], ["test", "Rent for six weeks in February, not August"]),
      row(["option", "Buy a cheap place inland and renovate slowly"], ["not_sure", "The real renovation cost, and whether I have the skill"], ["test", "Get two builders to quote on one house I actually view"]),
      row(["option", "Stay in the Netherlands, move to a village with a garden"], ["not_sure", "Whether it gives me enough of the daylight and the quiet"], ["test", "Spend a month house-sitting in Drenthe in the winter"]),
      row(["option", "Keep everything, work three days, travel four months a year"], ["not_sure", "Whether it is a real life or a long holiday from one"], ["test", "Try it for one quarter before deciding"]),
    ]),
  },
  "4.2": {
    must_have_check: table([
      row(["a", "Yes"], ["b", "Yes"], ["c", "Yes"], ["d", "Partly"]),
      row(["a", "Yes"], ["b", "Unknown"], ["c", "Yes"], ["d", "Yes"]),
      row(["a", "Yes"], ["b", "Partly"], ["c", "Yes"], ["d", "Yes"]),
      row(["a", "Yes"], ["b", "Yes"], ["c", "Yes"], ["d", "Yes"]),
    ]),
    overview: table([
      row(["dealbreaker", "No"], ["essentials", "None"], ["feeling", "5"], ["cost", "€2,245"], ["risk", "The winter, and being alone in it"]),
      row(["dealbreaker", "No"], ["essentials", "Internet unknown on the cheap houses"], ["feeling", "3"], ["cost", "€2,100 plus renovation"], ["risk", "A renovation that eats the runway"]),
      row(["dealbreaker", "No"], ["essentials", "Daylight and quiet only partly"], ["feeling", "3"], ["cost", "€2,900"], ["risk", "Nothing really changes"]),
      row(["dealbreaker", "No"], ["essentials", "No outside space of my own"], ["feeling", "2"], ["cost", "€3,240"], ["risk", "Another four years pass"]),
    ]),
    staying: table([
      row(["protects", "My salary, my sister ten minutes away, my doctor, the life I already know how to live"], ["costs", "Nine hours a day sitting down, a balcony I never use, and the answer to my own question postponed again"]),
    ]),
  },
  "5.1": {
    life_picture:
      "I want to wake with the light in a small house with land, and work three mornings a week at the bookkeeping I am good at. I want two hours outside every day and people close enough to eat with. I want to stop being afraid of January.",
    choice: "A direction to investigate",
    directions:
      "Renting a small house with land inland from Coimbra, around Góis or Arganil, for a year before buying anything.",
    why:
      "It meets every essential I wrote down. It is reversible, so a wrong answer costs me a year and not my savings. And the money check says I can carry the gap for about three years, which is long enough to find out properly.",
    essentials:
      "Outside space of my own. Internet I can work on. A doctor within half an hour. A day's travel to my sister. Neighbours.",
    assumptions:
      "That the internet is good enough to keep my clients. That €780 really rents a house with land. That I can bear February there alone. That my clients do not mind the address.",
    learn_next:
      "What a winter inland is actually like. Real monthly figures from two people who live there. What the residency paperwork takes, in weeks.",
    willing_to_give:
      "The office salary, €1,250 a month. The car. Two hours a week on Portuguese. Being near my sister every Sunday. I am not willing to give up my reserve of €8,000.",
    helpers: "My sister Lotte, Rui and Ineke in Góis, my oldest client Hendrik",
    first_question:
      "Can I work from there to the standard my clients pay for? It matters most because every other part of the plan rests on that €1,650 continuing.",
    next_step: "Book six weeks inland in February and ask for Thursdays at home",
    step_learning: "Whether the winter, the internet and the quiet are real or imagined",
    date: "20 October 2026",
    review_when: "The first week of April 2027, after the six weeks",
    continue_or_stop:
      "Continue if I can work two full weeks from there without a single apology to a client, and if February does not frighten me. Change direction if the internet fails. Stop if six weeks alone there makes me lonely rather than quiet.",
    two_years:
      "I will know it worked if I am outside two hours a day, if January 2029 does not frighten me, and if someone in the village knows how I take my coffee.",
  },
  "5.2": {
    people: table([
      row(["person", "Lotte, my sister"], ["shared", "That I should stop postponing this"], ["differ", "She wants me a day's drive away, not a flight"], ["concerns", "Who is here if our mother gets worse"], ["agreed", "I come back three times a year, dates fixed in advance"]),
      row(["person", "Hendrik, my oldest client"], ["shared", "The work matters, the address does not"], ["differ", "He wants one week a year in person"], ["concerns", "Response time in his busy month"], ["agreed", "I fly over in March every year, at my own cost"]),
    ]),
  },
};

/*
 * Step 2 and Step 3, only as far as the Blueprint reads them: the checked
 * figures, the Explore summary, the five lights, the decision and the dates.
 * Enough for the document to be a real document rather than a page of dashes.
 */
Object.assign(answers, {
  "s2-3.1": {
    costs: table([
      row(["guess", "780"], ["found", "950"], ["source", "Idealista, twelve listings near Góis"], ["date", "22 Feb 2027"]),
      row(["guess", "130"], ["found", "155"], ["source", "Rui and Ineke's winter bills"], ["date", "24 Feb 2027"]),
      row(["guess", "420"], ["found", "390"], ["source", "Two weeks of real shopping"], ["date", "28 Feb 2027"]),
      row(["guess", "165"], ["found", "175"], ["source", "Quote from a Portuguese broker"], ["date", "2 Mar 2027"]),
      row(["guess", "180"], ["found", "210"], ["source", "Fuel, and the road tax on an older car"], ["date", "3 Mar 2027"]),
      row(["guess", "70"], ["found", "55"], ["source", "Fibre, at a village address"], ["date", "24 Feb 2027"]),
      row(["guess", "60"], ["found", "95"], ["source", "The council tax on the house I viewed"], ["date", "5 Mar 2027"]),
      row(["guess", "320"], ["found", "330"], ["source", "Two flights home, plus a margin"], ["date", "6 Mar 2027"]),
    ]),
    income_there:
      "The bookkeeping travels with me. Nothing I earn depends on being in a particular room, which is the whole reason this is possible at all.",
  },
  "s2-5.1": {
    place:
      "A rented house with land in the Serra do Açor, inland from Coimbra — around Góis, Arganil or Pampilhosa da Serra.",
    where: "Portugal · Coimbra district · around Góis",
    reasons:
      "It has the outside space and the daylight. The fibre is real, so my clients never notice. And it is a day from my sister: a flight to Porto and two hours on the road.",
    not_give:
      "It does not give me a market town on the doorstep. The nearest proper market is twenty-five minutes away, and I have decided I can live with that.",
    monthly_cost:
      "About €2,360 a month, checked against real bills in February rather than brochure figures.",
    income: "€1,650 confirmed from the three clients. Everything above that is hoped for, not counted.",
    legal: "Residency as a self-employed person. I must prove steady income, health cover and an address.",
    healthcare: "Private cover for the first year, then the public system once I am registered.",
    unknowns:
      "Whether the fibre holds in a storm. What the house really costs to heat in January. Whether I will still want this in my third winter.",
    who_i_need: "A Portuguese accountant, Rui and Ineke in the village, and my own lawyer for the paperwork.",
    choice: "Go further with this place",
    next_step: "Book a second visit in November, alone, for ten days",
    date: "14 March 2027",
    review_when: "Mid-December 2027",
  },
  "s3-0.1": {
    life_picture:
      "I want to wake with the light in a small house with land, and work three mornings a week at the bookkeeping I am good at. I want two hours outside every day and people close enough to eat with. I want to stop being afraid of January.",
    must_haves: "Outside space of my own. Fast internet. A doctor within half an hour. A day's travel to my sister.",
    dealbreakers: "Internet I cannot work on. More than a day from Lotte. A kilometre from the nearest neighbour.",
    the_place: "A rented house with land around Góis, inland from Coimbra.",
    still_unknown: "The fibre in a storm. The real cost of heating in January. My third winter.",
    monthly_costs: "About €2,360. Housing and energy are checked against real bills; the rest are good estimates.",
    confirmed_income: "1650",
    savings_reachable: "21000",
    the_option:
      "Rent a house with land near Góis for twelve months, keep my three bookkeeping clients, and decide about buying only after a full year.",
    what_go_means: "A twelve-month rental, not a purchase. My flat here rented out, not sold.",
    when_roughly: "June 2027",
    who_decides: "Me. Lotte and Hendrik are consulted, and both already know.",
    decide_by: "1 May 2027",
    if_not_yet:
      "Six more months of saving, the Thursday at home, and the same decision again in December with better figures.",
  },
  green_lights: {
    lights: table([
      row(["colour", "Amber"], ["turns_green", "Two remote clients signed, or €200 off the monthly costs"], ["by_when", "30 June 2027"]),
      row(["colour", "Green"], ["turns_green", "Residency file checked by my lawyer and ready to send"], ["by_when", "Done, 4 March 2027"]),
      row(["colour", "Amber"], ["turns_green", "Lotte and I agree the dates I come back each year"], ["by_when", ""]),
      row(["colour", "Green"], ["turns_green", "The November visit confirmed the house and the village"], ["by_when", "Done"]),
      row(["colour", "Green"], ["turns_green", "The flat is rented out for the first year, not sold"], ["by_when", "Done"]),
    ]),
  },
  "s3-3.1": {
    steps: table([
      row(["step", "Move the bookkeeping fully online"], ["undo", "Easy"], ["first", "Nothing — this one I can do on my own"], ["when", "March 2027"]),
      row(["step", "Rent out my flat, rather than sell it"], ["undo", "Fairly easy"], ["first", "An agent who will manage it while I am away"], ["when", "April 2027"]),
      row(["step", "Give notice at the office, three months"], ["undo", "Hardest"], ["first", "Two clients confirmed in writing"], ["when", "April 2027"]),
      row(["step", "Sign the twelve-month rental near Góis"], ["undo", "Hard"], ["first", "Notice given, and the flat let"], ["when", "May 2027"]),
      row(["step", "Apply for residency"], ["undo", "Fairly easy"], ["first", "A signed rental contract as proof of address"], ["when", "June 2027"]),
    ]),
  },
  "s3-4.1": {
    check: table([
      row(["item", "Outside space of my own"], ["meets", "Yes"], ["certainty", "Known"]),
      row(["item", "Fast, reliable internet"], ["meets", "Yes"], ["certainty", "Estimate"]),
      row(["item", "A doctor within 30 minutes"], ["meets", "Yes"], ["certainty", "Known"]),
      row(["item", "Reachable from the Netherlands in a day"], ["meets", "Yes"], ["certainty", "Known"]),
      row(["item", "Neighbours, not isolation"], ["meets", "Partly"], ["certainty", "Estimate"]),
      row(["item", "A town with a market"], ["meets", "Yes"], ["certainty", "Known"]),
    ]),
  },
  "s3-4.2": {
    question: "Am I ready to rent a house with land near Góis for twelve months, from June 2027?",
    decision: "Go",
    must_haves_met:
      "All four essentials are met and no dealbreaker is broken. Neighbours is only partly met, and I accept that for a year.",
    reasons:
      "The money works: a 22-month runway once the return fund is set aside, and that is before a single new client. The place held up on a second visit, in winter, alone. And staying costs me another four years of the same week.",
    lights:
      "Papers, Place and Plan B are green. Money stays amber until two clients sign. People stays amber until Lotte and I fix the dates.",
    conditions:
      "The flat is rented out before I sign anything in Portugal, and the €8,000 reserve stays untouched.",
    who_decided: "Lotte knows and agrees. Hendrik has confirmed the work continues wherever I sit.",
    first_step: "Sign the twelve-month rental on the house near Góis, after the November visit.",
    first_step_date: "4 May 2027",
    review_when: "1 December 2027, after the first winter",
    would_change:
      "If neither new client signs by June and the costs hold at €2,360, I postpone by six months rather than start on a shrinking runway.",
  },
});

/*
 * The rest of Anna's case: the pages the result documents read that the first
 * pass did not fill in. Her figures stay the ones she already wrote — €2,360
 * a month found in Step 2, €1,650 confirmed, €42,000 of savings — so every
 * number the documents work out from them still ties back to a page she filled.
 */
Object.assign(answers, {
  /* ── Step 1, the two summary pages the documents quote ──────────────── */
  life_picture: {
    needs_patterns:
      "Outside, hands busy, and nobody waiting for me. The same three things come back in every good moment I wrote down.",
    more_of: "Daylight, quiet, and hours that belong to me rather than to a diary somebody else fills in.",
    keep: "My three regular clients. My sister Lotte within a day's travel. Work I am genuinely good at.",
    essentials: "Outside space of my own. Internet I can work on. A doctor within half an hour. A day's travel to Lotte.",
    tensions: "I want to be further away and closer to my mother at the same time. That does not resolve, it gets managed.",
    unknowns: "Whether I can live on less, or whether I am telling myself a nice story about it.",
  },
  starting_point: {
    today:
      "Work and money are steady; free time and home are where the gaps are. Family and friends is the one area I would not want to trade for anything.",
    time:
      "52 hours a week are fixed by other people and 28 go on must-dos. 32 are mine. I want that to be 60, and the first block back is Wednesday afternoon.",
    strengths:
      "I have done a hard change before: I ran my father's care for two years while keeping every client. Lotte's directness and Hendrik's loyalty are things I can lean on again.",
    stopped_before:
      "I waited for a moment when nothing was uncertain. It never came. This time I plan for the uncertainty instead of waiting it out.",
    beliefs_to_check: "That my clients need me in the same country. That a cheap house inland is a bargain.",
    unknowns: "What a January inland actually feels like when there is nobody to talk to.",
  },
  money_picture: {
    monthly_costs: "About €2,245 a month in my first guess. Housing and insurance are known; the rest are estimates.",
    one_time: "€11,000 for the move itself: the van, the deposit on a van, the lawyer, and two months of overlap.",
    income_sure: "€1,650 a month from the three clients I already have, confirmed.",
    income_hoped: "€700 from two new remote clients, and €350 from the guest room. Neither is counted.",
    first_check: "€595 short a month on my first guess, with savings that cover it for a long time.",
    money_words: "Freedom, fear, and January. The fear is always about one month of the year.",
    unknowns: "Heating. Health cover once I am self-employed there. What the car really costs on those roads.",
  },
  options: {
    keep:
      "Renting near Góis for a year, because it is reversible. And staying in a cheaper Dutch town on four-day weeks, because it tests the same need without leaving.",
    let_go:
      "Buying and renovating inland: I do not have the skill or the stomach for it yet. And the Algarve: the price and the crowds are the opposite of what I wrote down.",
    must_be_true: "Fibre I can work on, a doctor within half an hour, and a landlord who will take a twelve-month let.",
    risks: "That the quiet I am moving towards turns out to be loneliness in February.",
    find_out: "What the winter is like, and whether my clients mind the address.",
  },

  /* ── Step 2: the country scores, the daily checks and the visit ─────── */
  "s2-1.2": {
    countries: ["Portugal", "Spain", "Netherlands"],
    scores: {
      r0: { c1: "2", c2: "2", c3: "0" },
      r1: { c1: "2", c2: "1", c3: "2" },
      r2: { c1: "1", c2: "1", c3: "2" },
      r3: { c1: "1", c2: "1", c3: "2" },
      r4: { c1: "2", c2: "1", c3: "2" },
      r5: { c1: "2", c2: "2", c3: "2" },
      r6: { c1: "2", c2: "1", c3: "1" },
      r7: { c1: "2", c2: "1", c3: "2" },
      r8: { c1: "1", c2: "1", c3: "2" },
      r9: { c1: "1", c2: "1", c3: "2" },
    },
  },
  country_choice: {
    country: "Portugal",
    reasons: "The climate and the land are what I am actually moving for, and the budget works there.",
    let_go: "Spain: the summer heat scores zero for me. Home scores highest on paper, and still does not give me the two things I want most.",
    doubt: "The language. I have six words.",
    must_check: "The residency route for a self-employed bookkeeper, with my own lawyer.",
  },
  "s2-3.3": {
    daily: {
      r0: { p1: "40 minutes to Coimbra", p2: "35 minutes", certainty: "Known" },
      r1: { p1: "25 minutes, taking new patients", p2: "In the town itself", certainty: "Estimate" },
      r2: { p1: "Public system once registered; private cover for the first year.", p2: "Same", certainty: "Estimate" },
      r4: { p1: "300 Mb fibre, measured at the kitchen table", p2: "Fibre in the town, not on the edges", certainty: "Known" },
      r5: { p1: "My own clients, online. Nothing local.", p2: "Same", certainty: "Known" },
      r6: { p1: "12 minutes to Góis, a market on Saturday", p2: "In the town", certainty: "Known" },
      r7: { p1: "2 h to Porto, then a 2 h 40 flight", p2: "2 h 15 to Porto", certainty: "Known" },
      r8: { p1: "Cold and wet from December. Wood heating in every house I saw.", p2: "A little milder", certainty: "Estimate" },
      r9: { p1: "Hot and dry. Fire risk is real and the clearing is the law.", p2: "Same", certainty: "Known" },
    },
  },
  "s2-4.3": {
    ordinary_week:
      "On the Wednesday it rained all day, I worked until two and then walked to the village in the wet, and it still felt like my life.",
    rather_overlooked:
      "How quiet the valley is after eight in the evening, and how far away everyone I know would be.",
    good_surprise: "A neighbour I had never met turned up with firewood the day I arrived.",
  },
  test_visit: {
    where_when: "Góis and Arganil, eight days in February 2027, in the weather I was most afraid of.",
    confirmed:
      "Eight days in February gave me what the research could not: an ordinary winter week, with laundry, bad internet weather and nothing special happening.",
    changed:
      "The house: the cold old places I had been looking at are not workable, so I am looking at newer rentals.\nThe language: fewer people spoke English than I expected, so I start lessons now.\nThe distance: Lotte would be a flight away, not a drive.",
    best_fit: "Góis, because of the fibre and the Saturday market.",
    still_test: "A full summer, and the fire season.",
  },

  /* ── Step 3: the money check, the place, Plan B and the risks ───────── */
  "s3-1.1": {
    check_one: {
      r0: { amount: "42000" },
      r1: { amount: "600" },
      r2: { amount: "11000" },
      r3: { amount: "2300" },
      r4: { amount: "8000" },
      r5: { amount: "4000" },
      r6: { amount: "16100" },
    },
    check_two: {
      r0: { answer: "1650" },
      r1: { answer: "None agreed yet. The €700 from two remote clients is still hoped for, not counted." },
      r2: { answer: "2360 — housing and insurance known, the rest still estimates" },
      r3: { answer: "-710" },
      r4: { answer: "22" },
      r5: { answer: "18" },
      r6: {
        answer:
          "Costs €3,068, short €1,418 a month, and the runway falls to 11 months. That is under the 18 I want, so I would delay by a season and bank the summer work first.",
      },
    },
    adviser_questions: "Where I pay tax in the first year, and what happens to my Dutch pension if I deregister.",
    money_light: "Amber",
    money_green_by: "Two remote clients signed, or €200 off the monthly costs. By 30 June 2027.",
  },
  "s3-1.4": {
    place: "A rented house with land around Góis, inland from Coimbra.",
    known: "The fibre, the Saturday market, the drive to Coimbra, and what a wet February is like.",
    estimate_unknown: "The heating bill in January and what the fire season asks of me.",
    off_season: "Yes. Eight days in February 2027, and ten days alone in November.",
    rent_or_buy: "I rent for a full year before I even look at buying.",
    change_my_mind: "A winter where the internet drops for days, or a landlord who will not sign twelve months.",
    place_light: "Green",
    place_green_by: "Already green: the November visit confirmed what February showed.",
  },
  "s3-1.5": {
    how_much: "Enough that a bad year costs me a year, not my savings. I have watched someone lose both.",
    keep: "I rent my flat out rather than sell it, so there is a roof to come back to.",
    return_fund:
      "€4,000 kept apart, which covers the van home and a first month somewhere. Lotte's spare room is where I would land.",
    warning_sign: "Two months where I do not want to leave the house, or a client leaving over the distance.",
    review_when: "1 December 2027, after the first winter",
    what_then: "Give notice on the rental, come back in spring, and keep the clients I kept.",
    who_helps: "Lotte, and Hendrik for the work.",
    planb_light: "Green",
    planb_green_by: "Already green once the flat is let rather than sold.",
  },
  "s3-2.1": {
    o1_good:
      "I am at the kitchen table by eight, finished by one, and in the garden with the afternoon still ahead of me.",
    o1_hard: "Three days of rain, no post, and a client who has not replied since Monday.",
    o2_good: "A four-day week in a cheaper Dutch town, with the garden allotment and Lotte twenty minutes away.",
    o2_hard: "The same Tuesday I already have, with less money and the question still unanswered.",
  },
  "s3-2.2": {
    risks: {
      r0: {
        option: "Góis",
        fear: "The quiet turns into loneliness",
        likely: "Medium",
        impact: "High",
        sign: "Two months where I do not want to leave the house",
        do: "Portuguese lessons from week one, and the market every Saturday whether I need anything or not.",
      },
      r1: {
        option: "Góis",
        fear: "A client leaves over the address",
        likely: "Low",
        impact: "High",
        sign: "A quarter-end where Hendrik asks to meet in person twice",
        do: "Fly over in March every year at my own cost, and say so before I go.",
      },
      r2: {
        option: "Góis",
        fear: "My mother's health turns while I am four hours away",
        likely: "Medium",
        impact: "High",
        sign: "A second hospital visit in one month",
        do: "A flight budget kept separate, and the dates I come back fixed with Lotte in advance.",
      },
    },
  },
  risks: {
    biggest: "Loneliness in February, and my mother's health. Both medium, both things I can prepare for rather than prevent.",
    signs: "Two months indoors. A second hospital visit in a month. A client asking to meet twice in a quarter.",
    prevent: "Lessons from week one, a fixed flight budget, and the return dates agreed with Lotte before I go.",
    anywhere: "January would still frighten me in Utrecht. That one comes with me.",
  },
  first_timeline: {
    easy_steps: "Moving the bookkeeping fully online, and letting the flat rather than selling it. March and April.",
    hard_steps: "Giving notice at the office, and signing a twelve-month rental. Not before the income is in writing.",
    first_step: "Move the bookkeeping fully online, so the address stops mattering.",
    first_step_date: "4 May 2027",
    extra_time: "Six weeks between the rental signature and the move, for the paperwork to be slower than promised.",
  },
});

const statuses = {};
for (const id of Object.keys(answers)) statuses[id] = "done";
// Watched lessons. Step 1 finished, Step 2 half way: somebody in the middle of
// the course rather than at either end of it.
statuses["module:introduction"] = "done";
for (const p of ["p0", "p1", "p2", "p3", "p4", "p5"]) statuses[`module:phase-1:step-1:${p}`] = "done";
for (const p of ["s2-p0", "s2-p1", "s2-p2"]) statuses[`module:phase-1:step-2:${p}`] = "done";

const data = {
  signedIn: true,
  profile: {
    first_name: "Anna",
    language: "en",
    currency: "EUR",
    consent_ai: true,
    consent_founder_access: false,
    wants_updates: true,
  },
  answers,
  statuses,
  entitlements: [],
};

writeFileSync(process.argv[2], JSON.stringify(data), "utf8");
console.log("seeded", Object.keys(answers).length, "pages");
