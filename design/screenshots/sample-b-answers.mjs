/*
 * Sample B: the answers of somebody who decides to stay.
 *
 * Sam is invented, like Anna in example-answers.mjs, and answers the same way:
 * honestly, with one thing still open. The difference is the route. Sam is not
 * choosing a country; Sam is choosing a different week in the town where Sam
 * already lives, and Step 3 ends with the staying route and My Change Plan.
 *
 * The figures tie out all the way through, so the printed documents show real
 * numbers rather than dashes: €2,285 a month today against €2,210 after the
 * change, €2,360 of confirmed pay on four days, €14,000 of savings becoming
 * €6,710 to live on after the reserve, and a month that ends €150 up instead
 * of a runway counting down.
 *
 * Run: node design/screenshots/sample-b-answers.mjs <somewhere>/sam.json
 * Then follow design/results/README.md, "How to print them again".
 */
import { writeFileSync } from "node:fs";

const row = (...cells) => Object.fromEntries(cells.map(([k, v]) => [k, String(v)]));
const table = (rows) => Object.fromEntries(rows.map((r, i) => [`r${i}`, r]));

const answers = {
  "0.1": {
    moment:
      "A Friday in September when I took a day off for no reason. I spent it in my sister's garden, moved three wheelbarrows of soil, and ate outside. I did not look at my phone until the evening.",
    normal_day:
      "Stop work at half past five. Walk by the river while it is still light. Eat with somebody. One whole day a week outside, with my hands dirty.",
    keep: "My job and the people in it. My flat. My sister ten minutes away. The Thursday market.",
    big_question: "Can I have the life I want here, or do I have to go somewhere else to get it?",
  },
  "1.0": {
    no_to_yes: table([
      row(["no", "Answering email at nine in the evening"], ["yes", "A day that ends when I say it ends"]),
      row(["no", "Seeing daylight only through a window"], ["yes", "Outside every day, even in the rain"]),
      row(["no", "Saturday spent catching up on the week"], ["yes", "A Friday that belongs to me"]),
      row(["no", "Always meaning to start the allotment"], ["yes", "Growing something, badly, but every week"]),
    ]),
  },
  "1.1": {
    moments: [
      "That Friday in my sister's garden, moving soil.",
      "Walking home from work in June, the long way, by the water.",
      "Cooking for six people on a Sunday with the door open.",
      "Two weeks of cycling to work last summer.",
      "Repairing the shed with my neighbour, badly, and laughing about it.",
    ],
    common:
      "I was outside, I was using my body, and nothing was waiting for me. None of it was far from here. All of it happened within a few streets of where I live.",
  },
  "1.2": {
    day:
      "I wake up without an alarm and the house is quiet. I work from nine until half past five, and then I stop. I walk by the river before dinner, while it is still light. On Friday I am outside all day, with my hands dirty and my phone in a drawer. I eat with people I know, in the town I already live in.",
    needs:
      "Daylight after work. Something to do with my hands. People who are a short walk away, not a flight away.",
    deeper:
      "I kept writing a day that is here. Not a different country, a different week. That surprised me, because I had been reading about other places for two years.",
  },
  "1.3": {
    dream_list: [
      "A whole day outdoors every week.",
      "An allotment, or a corner of somebody else's.",
      "Four days of work instead of five.",
      "A bike that works, and a reason to use it.",
      "Two evenings a week that belong to me.",
    ],
    top3:
      "The four-day week, the outdoor day, and the evenings. The rest costs almost nothing once those three are true.",
    deeper:
      "If money were no worry I would still live here. That told me the money question is smaller than I thought.",
  },
  "1.4": {
    values: ["Health", "Freedom", "Family", "Nature", "Simplicity"],
    top_two: table([
      row(["word", "Health"], ["week", "Outside every day, and a body that is tired for a good reason"]),
      row(["word", "Freedom"], ["week", "Two evenings and one day a week that nobody else fills in"]),
    ]),
    must_haves: table([
      row(["must_have", "Daylight after work, most days"], ["importance", "Essential"]),
      row(["must_have", "One whole day a week outdoors"], ["importance", "Essential"]),
      row(["must_have", "Rent I can pay without counting"], ["importance", "Essential"]),
      row(["must_have", "My sister within half an hour"], ["importance", "Essential"]),
      row(["must_have", "Work I am good at"], ["importance", "Strongly preferred"]),
      row(["must_have", "A patch of ground of my own"], ["importance", "Strongly preferred"]),
    ]),
    dealbreakers:
      "A week with no daylight in it. Moving away from my sister. Rent I have to think about on the first of the month.",
    keep:
      "My job and the people in it. My flat and the rent I can afford. My sister ten minutes away. The Thursday market. Knowing the chemist by name.",
    let_go:
      "Being the one who answers in the evening. The idea that the life I want is somewhere abroad. Two hours a day on screens that are not work.",
  },
  "1.5": {
    checks:
      "I read the day back and asked whose it was. It is mine. Nobody in it is impressed by me, which is how I knew.",
    voices:
      "My father's voice says a four-day week is not serious work. My own says five days has not made me good at it either.",
  },
  "2.1": {
    wheel: table([
      row(["today", "4"], ["year", "8"], ["week", "I sit for nine hours and walk to the car."], ["better", "Outside every day and tired for a good reason."]),
      row(["today", "7"], ["year", "7"], ["week", "Enough comes in. I do not think about it much."], ["better", "The same, on four days instead of five."]),
      row(["today", "6"], ["year", "7"], ["week", "Work I am good at, in weeks that never end."], ["better", "The same work, finished by half past five."]),
      row(["today", "5"], ["year", "6"], ["week", "Too tired to be good company by Thursday."], ["better", "Evenings with something in them."]),
      row(["today", "8"], ["year", "8"], ["week", "My sister weekly, friends when I manage it."], ["better", "The same, plus a standing Friday."]),
      row(["today", "3"], ["year", "8"], ["week", "Free time happens by accident."], ["better", "One whole day, every week, outside."]),
      row(["today", "4"], ["year", "6"], ["week", "I read about other people's lives."], ["better", "Learning to grow things, slowly."]),
      row(["today", "6"], ["year", "7"], ["week", "A flat I like, with no outside space."], ["better", "The same flat, and ground somewhere near it."]),
    ]),
    // Rows: work, home, family, outside, things for me, screens.
    time: table([
      row(["now", "52"], ["want", "42"]),
      row(["now", "10"], ["want", "10"]),
      row(["now", "8"], ["want", "10"]),
      row(["now", "4"], ["want", "14"]),
      row(["now", "6"], ["want", "10"]),
      row(["now", "14"], ["want", "6"]),
    ]),
    most_time_back: "The two hours a day on screens, and the evening work that nobody asked for.",
    // Rows: fixed by others, must do's, my choice. The third row is the one
    // the documents draw.
    decides: table([
      row(["now", "52"], ["want", "42"]),
      row(["now", "44"], ["want", "44"]),
      row(["now", "16"], ["want", "26"]),
    ]),
    drop: "Evening email. The second hour of news. Saturday catch-up work.",
    fixed_block: "Nine to half past five, five days a week, plus the evenings I give away for nothing.",
    take_back:
      "Two evenings a week to start, then the whole of Friday. That is about ten hours back, every week.",
    deeper:
      "Sixteen hours out of a hundred and twelve are mine. I had guessed thirty. Writing it down was the part that changed my mind.",
  },
  "2.2": {
    successes: [
      "Cycled to work for two weeks last summer and felt different by the end of it.",
      "Took one unpaid day in September and did not regret the money.",
      "Said no to a Saturday project last year, and nothing happened.",
    ],
    dots: "Every good change I have made was small, boring and repeated. None of them needed a new country.",
    deeper: "I am better at keeping a small promise than at making a big plan.",
  },
  "2.3": {
    causes: ["Waited for the right moment", "Did not want to seem difficult at work", "Thought it had to be all or nothing"],
    before: "I have thought about asking for four days for two years. I never asked.",
    differently: "Ask the question before I have the whole answer. Test it for four weeks first, so I am asking about something real.",
    deeper: "The thing stopping me was not money. It was not wanting to be the person who asks.",
  },
  "2.4": {
    beliefs:
      "That part-time means not serious. That my manager would say no. That I need to move abroad to get daylight and quiet.",
    deeper: "I have never checked any of the three. Two of them I can check this month.",
  },
  "2.5": {
    surprised:
      "My sister said she had been waiting for me to do this for years. My neighbour said he thought I already had Fridays off, because I am never around on them anyway.",
  },
  "3.1": {
    words: "Money is enough, but only when I stop treating it as the reason I cannot change anything.",
    what_helps: "Seeing the real monthly figure instead of the one I imagine.",
  },
  "3.2": {
    costs: table([
      row(["today", "980"], ["new_life", "980"], ["certainty", "Known"]),
      row(["today", "160"], ["new_life", "160"], ["certainty", "Known"]),
      row(["today", "420"], ["new_life", "400"], ["certainty", "Estimate"]),
      row(["today", "150"], ["new_life", "110"], ["certainty", "Estimate"]),
      row(["today", "140"], ["new_life", "140"], ["certainty", "Known"]),
      row(["today", "55"], ["new_life", "55"], ["certainty", "Known"]),
      row(["today", "180"], ["new_life", "150"], ["certainty", "Estimate"]),
      row(["today", "60"], ["new_life", "60"], ["certainty", "Known"]),
      row(["today", "0"], ["new_life", "0"], ["certainty", "Known"]),
      row(["today", "0"], ["new_life", "0"], ["certainty", "Known"]),
      row(["today", "90"], ["new_life", "90"], ["certainty", "Known"]),
      row(["today", "50"], ["new_life", "65"], ["certainty", "Estimate"]),
    ]),
  },
  "3.3": {
    // Rows: moving and travel, documents and fees, furniture and setting up,
    // two homes for a while, other. Only two of them mean anything for a
    // change at home: tools and boots, and then the two unpaid test Fridays
    // and the bike under "other".
    one_time: table([
      row(["amount", "0"], ["certainty", "Known"]),
      row(["amount", "0"], ["certainty", "Known"]),
      row(["amount", "180"], ["certainty", "Estimate"]),
      row(["amount", "0"], ["certainty", "Known"]),
      row(["amount", "510"], ["certainty", "Known"]),
    ]),
  },
  "3.4": {
    income: table([
      row(["source", "My salary, five days"], ["now", "2950"], ["new_life", "0"], ["certainty", "Confirmed"], ["starts", "Ends when the change starts"]),
      row(["source", "My salary, four days"], ["now", "0"], ["new_life", "2360"], ["certainty", "Confirmed"], ["starts", "From the fourth month"]),
      row(["source", "Weekend hours at the plant nursery"], ["now", "0"], ["new_life", "120"], ["certainty", "Hoped"], ["starts", "From the sixth month, if I want it"]),
    ]),
  },
  "3.5": {
    savings: { savings: "14000", deposits: "0", reserve: "6600" },
    deeper:
      "Four days leaves me about €150 up at the end of the month, on confirmed pay alone. That is a smaller margin than I would like, and it is still a plus rather than a countdown. The €6,600 reserve is three months of everything, and I do not touch it.",
    hours_for_fixed:
      "About 46 hours a month go to fixed costs today. After the change it is about 44, on four days instead of five.",
    income_fixed_place:
      "All of it is tied to this place, and that is the point. I am not asking my income to move.",
  },
  "4.1": {
    options: table([
      row(["option", "Four days a week here, Friday outdoors"], ["not_sure", "Whether my manager agrees, and whether four-fifths pay is comfortable"], ["test", "Four weeks of evenings that end at six, and one unpaid Friday"]),
      row(["option", "Move somewhere greener and cheaper"], ["not_sure", "Whether I would still have anybody to eat with"], ["test", "Two weeks living there in an ordinary week, not a holiday"]),
      row(["option", "Change nothing"], ["not_sure", "Whether I can live with another two years of this week"], ["test", "Read back what I wrote in Step 1, in eight weeks"]),
    ]),
  },
  "4.2": {
    must_have_check: table([
      row(["must_have", "Daylight after work, most days"], ["option_1", "Yes"], ["option_2", "Yes"], ["option_3", "No"]),
      row(["must_have", "One whole day a week outdoors"], ["option_1", "Yes"], ["option_2", "Maybe"], ["option_3", "No"]),
      row(["must_have", "Rent I can pay without counting"], ["option_1", "Yes"], ["option_2", "Yes"], ["option_3", "Yes"]),
      row(["must_have", "My sister within half an hour"], ["option_1", "Yes"], ["option_2", "No"], ["option_3", "Yes"]),
    ]),
    overview:
      "Option one meets everything. Option two breaks a dealbreaker. Option three keeps the problem I started with.",
    staying:
      "Staying is not the safe answer here. It is the one that keeps the four things I said are essential, and it still asks me to change the week I work.",
  },
  "5.1": {
    life_picture:
      "I stay in the town I know, and I get my evenings back. I work four days, and the fifth day is outdoors. I am outside every day, even when the weather is bad.",
    choice: "Build the life I want where I am",
    directions:
      "A four-day week in the same job, with Friday outdoors, and two evenings a week that end at six.",
    why:
      "What I want is already here. Everything I would miss is within a few streets. Moving would cost me the people I stay for, to solve a problem that is really about my week.",
    essentials: "Daylight after work. One outdoor day. Rent I can pay without counting. My sister nearby.",
    assumptions:
      "That my manager will discuss four days at all. That I can live on four-fifths of my pay. That I will actually go outside when the evening is free.",
    learn_next: "What two free evenings a week really feel like after the novelty has gone.",
    willing_to_give:
      "A fifth of my pay. The idea that something better is somewhere else. Two hours a day of screens.",
    helpers: "My sister, and my manager if she says yes.",
    first_question:
      "Will I use the free evenings, or fill them with work again? It matters most because everything else rests on it.",
    next_step: "No work after six on Tuesday and Thursday, for four weeks.",
    step_learning: "Whether the problem is my hours or my habits.",
    date: "In the first week",
    review_when: "In 8 weeks",
    continue_or_stop:
      "If I am outside on most of those evenings, I ask for the four-day week. If I work through them anyway, the hours are not the problem, and I look at the job instead.",
    two_years:
      "I will know it worked if a normal Friday is spent outside and I have stopped reading about other people's countries.",
    clarity_now: "8",
    clarity_changed:
      "I can describe the week now, not just the feeling. What is still unclear is whether work will agree, and that is a question rather than a fog.",
  },
  "5.2": {
    people: "My sister first. Then my manager. Then the team, once there is something to tell them.",
  },

  /* Step 2, as a staying person does it: the place is here, and the testing is
     four weeks of a different week rather than a visit. */
  "s2-0.1": {
    life_picture:
      "I stay in the town I know, and I get my evenings back. I work four days, and the fifth day is outdoors.",
    directions: "A four-day week here, with Friday outdoors and two evenings that end at six.",
    must_haves: "Daylight after work. One outdoor day. Rent I can pay without counting. My sister nearby.",
    dealbreakers: "A week with no daylight in it. Moving away from my sister.",
    willing_to_invest: "A fifth of my pay, two unpaid test Fridays, and one uncomfortable conversation.",
    place_kind: "The town where I live",
    top_three: "My own street, the allotments by the river, and my sister's garden ten minutes away.",
  },
  /* The staying path (workbook Rev.01c). Sam skips Parts 3 to 5. */
  "s2-s1": {
    change: "Four days a week in the same job, with Friday outdoors, and two evenings that end at six.",
    gives: "Daylight after work, one day a week outside, and my own rent still paid without counting.",
    keep: "My job and the people in it. The flat. My sister ten minutes away. The Thursday market.",
    still_hard: "January is dark whatever I do. And I am the one who fills my own evenings with work.",
  },
  "s2-s2": {
    money: table([
      row(["now", "2950"], ["after", "2360"], ["certainty", "Known"]),
      row(["now", "2285"], ["after", "2198"], ["certainty", "Estimate"]),
      row(["now", "665"], ["after", "162"], ["certainty", "Estimate"]),
      row(["now", "0"], ["after", "690"], ["certainty", "Known"]),
      row(["now", "6600"], ["after", "6600"], ["certainty", "Known"]),
    ]),
  },
  "s2-s3": {
    rules: table([
      row(["found", "The handbook allows a request for fewer hours after two years. I have nine."], ["date", "First week"]),
      row(["found", "Two months' notice on a change of hours, in writing."], ["date", "First week"]),
      row(["found", "Not needed. I stay employed."], ["date", "First week"]),
      row(["found", "Not needed. The flat stays as it is, and the allotment is the council's."], ["date", "Second week"]),
      row(["found", "Pension contributions drop with the pay. HR is checking what that costs over ten years."], ["date", "Second week"]),
      row(["found", "HR for the hours and the pension. The council for the allotment list."], ["date", "First week"]),
    ]),
  },
  "s2-s4": {
    week: table([
      row(["now", "52"], ["after", "42"], ["certainty", "Known"]),
      row(["now", "44"], ["after", "44"], ["certainty", "Estimate"]),
      row(["now", "16"], ["after", "26"], ["certainty", "Estimate"]),
      row(["now", "0"], ["after", "3"], ["certainty", "Estimate"]),
    ]),
  },
  "s2-s5": {
    people: table([
      row(["who", "My sister"], ["means", "A standing Friday, and the dog on days I am home"], ["needs", "To know which Friday, a week ahead"], ["agreed", "Friday mornings, from March"]),
      row(["who", "My manager"], ["means", "A handover every Thursday, and no Friday meetings"], ["needs", "To see a month of it working first"], ["agreed", "We talk again after the trial"]),
      row(["who", "My team"], ["means", "Thursday becomes the day to ask me things"], ["needs", "A calendar they can see"], ["agreed", "I tell them once it is signed"]),
      row(["who", "The neighbour who works four days"], ["means", "Nothing, but he has done it"], ["needs", "Nothing"], ["agreed", "He says the first month is the hard one"]),
    ]),
  },
  "s2-s6": {
    test: "Two evenings a week that end at six, for four weeks, and one unpaid Friday.",
    how: "No work after six on Tuesday and Thursday. One Friday off in the fourth week, unpaid.",
    costs: "€210 of pay for the Friday. The evenings cost nothing but the habit.",
    questions:
      "Do I go outside when the evening is free? Does anything at work actually break? Do I miss the money?",
    dates: "The four weeks after this page, ending with the unpaid Friday.",
    confirmed:
      "I used the evenings when something was waiting for me outside. The Friday was the best day of the month, and nothing at work went wrong.",
    changed:
      "I stopped looking at houses abroad. The problem was the week, not the country. I also learned the evenings only work when somebody is expecting me.",
    still_test: "A Friday in January, when it is dark and wet, before I call this settled.",
  },
  "s2-s7": {
    change: "Four days a week in the same job, with Friday outdoors.",
    gives_keeps:
      "Daylight after work and one day a week outside. I keep the job, the flat, my sister nearby and the market.",
    reasons:
      "Everything I said is essential is already here. The test worked on six evenings out of eight. Moving would cost me the people I stay for.",
    not_give:
      "It does not give me land of my own. A corner of a neighbour's allotment does for now, and the list moves in the spring.",
    money: "€2,360 a month after the change, against €2,198 of costs. €162 left over, and the €6,600 reserve untouched.",
    rules:
      "The handbook allows the request after two years; I have nine. Two months' notice, in writing. HR is still checking what the lower pay does to my pension.",
    hours: "About 16 hours a week are mine now. About 26 after the change, less the three the allotment adds.",
    people:
      "My sister wants a week's notice on the Friday. My manager wants a month of it working first. The team wants Thursday to be the day they ask me things.",
    test: "Six evenings out of eight, and the unpaid Friday spent outside. Nothing at work went wrong.",
    unknowns: "What the lower pay does to my pension over ten years. Whether I keep it up in January.",
    choice: "Go further with this change",
    next_step: "Ask my manager for a meeting about four days.",
    review_when: "In 8 weeks",
  },

  "s2-5.3": {
    really_want: "My evenings and one outdoor day. Not a different country.",
    change: "A four-day week, with Friday outdoors, and two evenings that end at six.",
    protects_costs:
      "It protects my sister nearby, my rent, and work I am good at. It costs me a fifth of my pay, and the idea that something better is elsewhere.",
    before_abroad:
      "Nothing right now. I would look again only if the work stopped or if the people I stay for moved away.",
    review: "In 8 weeks",
  },

  /* Step 3: the decision, the five lights, and the staying route. */
  "s3-0.1": {
    life_picture: "I stay in the town I know, I work four days, and the fifth day is outdoors.",
    must_haves: "Daylight after work. One outdoor day. Rent I can pay without counting. My sister nearby.",
    dealbreakers: "A week with no daylight in it. Moving away from my sister.",
    the_place: "Here. The same flat, the same street.",
    still_unknown: "Whether my manager agrees, and whether I keep the evenings once the novelty goes.",
    monthly_costs: "€2,210",
    confirmed_income: "€2,360",
    savings_reachable: "€14,000",
    the_option: "Four days a week here, with Friday outdoors.",
    what_go_means: "A written request for four days, with my notice period, and the first Friday off.",
    when_roughly: "In place by the fourth month.",
    who_decides: "Me, with my sister as the person I talk it through with.",
    decide_by: "In 8 weeks",
    if_not_yet: "Keep the two evenings, ask again after six months, and take one unpaid day a month meanwhile.",
  },
  "s3-1.1": {
    check_one: table([
      row(["amount", "14000"]),
      row(["amount", "0"]),
      row(["amount", "690"]),
      row(["amount", "0"]),
      row(["amount", "6600"]),
      row(["amount", "0"]),
      row(["amount", "6710"]),
    ]),
    check_two: table([
      row(["answer", "2360"]),
      row(["answer", "None agreed. The €120 of weekend hours is hoped for, not counted."]),
      row(["answer", "2210 — housing and insurance known, food and transport still estimates"]),
      row(["answer", "150"]),
      row(["answer", "Not short, so there is no runway counting down."]),
      row(["answer", "6"]),
      row(["answer", "Costs €2,873 and I am €513 short each month. The reserve covers about 13 months. I would go back to five days for a season rather than spend it."]),
    ]),
    adviser_questions:
      "What four days does to my pension and my holiday days, and whether the request has to be permanent.",
    money_light: "Amber",
    money_green_by: "After one full month lived on €2,360",
  },
  "s3-1.2": {
    papers: "Nothing changes. Same country, same contract, same address. The only paper is the written request for four days and my notice period.",
    papers_light: "Green",
    papers_green_by: "Done",
  },
  "s3-1.3": {
    people: "My sister knows and will walk on Fridays. My manager has agreed to a meeting. The team finds out when there is something to tell.",
    who_will_be_there: "My sister, ten minutes away. The neighbour with the shed. The two people at the allotments.",
    people_light: "Green",
    people_green_by: "Done",
  },
  "s3-1.4": {
    place: "Here. The same flat, the same street, the same town.",
    known: "All of it. I have lived here for nine years.",
    estimate_unknown: "Only the allotment, which is a waiting list rather than a question.",
    off_season: "I have lived through every winter here. January is grey and I already know what it does to me.",
    rent_or_buy: "I rent, and I keep renting. A four-day week is not the month to take on a mortgage.",
    change_my_mind: "If my landlord sells the flat, or if the allotment never comes.",
    place_light: "Green",
    place_green_by: "Done",
  },
  "s3-1.5": {
    how_much: "Nothing has to be set aside to come back from this, because I am not leaving.",
    keep: "My five-day contract until the four-day one is signed. My reserve of €6,600, untouched.",
    return_fund: "Not needed. The equivalent is the reserve, and the fact that four days is reversible.",
    warning_sign: "Two months where I work through the free evenings anyway.",
    review_when: "Three months after the change",
    what_then: "Go back to five days and look at the job itself rather than the hours.",
    who_helps: "My sister. She is the one who will notice before I do.",
    planb_light: "Green",
    planb_green_by: "Done",
  },
  green_lights: {
    lights: table([
      row(["colour", "Amber"], ["turns_green", "One full month lived on €2,360, with the rent and the bills paid out of it"], ["by_when", "After the first month"]),
      row(["colour", "Green"], ["turns_green", "Nothing to arrange. Same country, same contract, same address"], ["by_when", "Done"]),
      row(["colour", "Green"], ["turns_green", "My sister knows, and my manager has agreed to a meeting"], ["by_when", "Done"]),
      row(["colour", "Green"], ["turns_green", "I stay in the flat I know, at the rent I know"], ["by_when", "Done"]),
      row(["colour", "Green"], ["turns_green", "Four days is reversible, and the reserve is untouched"], ["by_when", "Done"]),
    ]),
  },
  "s3-2.1": {
    o1_good: "Four days from the fourth month. Fridays outside. Evenings I use. €150 a month left over.",
    o1_hard: "A fifth less pay, and a manager who tells the team before I do.",
    o2_good: "Nothing changes, nothing is risked, and the money stays where it is.",
    o2_hard: "Another two years of the same week, and the same conversation with myself every September.",
    still_difficult: "Keeping the evenings free when nobody is checking. That is hard in both futures.",
  },
  "s3-2.2": {
    risks: table([
      row(["option", "Four days here"], ["fear", "I get the time and fill it with work again"], ["likely", "High"], ["impact", "High"], ["sign", "Two Fridays in a row where I do not leave the house"], ["do", "A standing Friday with my sister, so somebody is expecting me"]),
      row(["option", "Four days here"], ["fear", "My manager says no"], ["likely", "Medium"], ["impact", "Medium"], ["sign", "The meeting keeps being moved"], ["do", "Keep the two evenings, ask again after six months, one unpaid day a month meanwhile"]),
      row(["option", "Four days here"], ["fear", "Four-fifths pay turns out to be tight"], ["likely", "Medium"], ["impact", "Medium"], ["sign", "The first month ends with nothing left over"], ["do", "Live on the lower figure for a month before I sign anything"]),
    ]),
    biggest_fear: "That I get the time and waste it, and find out the problem was me.",
  },
  risks: {
    biggest: "That I get the Friday and spend it indoors on a screen.",
    signs: "Two Fridays in a row where I do not leave the house.",
    prevent: "A standing arrangement with my sister, and the allotment corner, so somebody is waiting.",
    anywhere: "This risk follows me to any country, which is most of the reason I am not moving.",
  },
  "s3-3.1": {
    fixed_dates: "My notice period is two months. The allotment list moves in the spring.",
    steps: table([
      row(["step", "Ask my manager for a meeting"], ["undo", "Easy"], ["first", "A month of figures I believe"], ["when", "First week"]),
      row(["step", "Live on four-fifths pay on paper"], ["undo", "Easy"], ["first", "Last three months of spending in front of me"], ["when", "First month"]),
      row(["step", "Put the request in writing"], ["undo", "Fairly easy"], ["first", "A yes in principle"], ["when", "Second month"]),
      row(["step", "Take a corner of a neighbour's allotment"], ["undo", "Easy"], ["first", "Tools and boots"], ["when", "Third month"]),
      row(["step", "First Friday outdoors"], ["undo", "Easy"], ["first", "The change in place"], ["when", "Fourth month"]),
    ]),
  },
  "s3-4.1": {
    check: table([
      row(["item", "Daylight after work, most days"], ["meets", "Yes"], ["certainty", "Known"]),
      row(["item", "One whole day a week outdoors"], ["meets", "Yes"], ["certainty", "Estimate"]),
      row(["item", "Rent I can pay without counting"], ["meets", "Yes"], ["certainty", "Known"]),
      row(["item", "My sister within half an hour"], ["meets", "Yes"], ["certainty", "Known"]),
      row(["item", "A patch of ground of my own"], ["meets", "Partly"], ["certainty", "Estimate"]),
      row(["item", "Dealbreaker: a week with no daylight in it"], ["meets", "Yes"], ["certainty", "Known"]),
    ]),
  },
  "s3-4.2": {
    question: "Do I change my life where I am, or do I move?",
    decision: "Go and change where I am",
    must_haves_met:
      "Yes. All four essentials are met, and no dealbreaker is broken. The allotment is strongly preferred, not essential, and it is on its way.",
    reasons:
      "What I want is already here. The four-week test worked on six evenings out of eight. Moving would cost me the people I stay for.",
    lights:
      "Money is amber until I have lived one full month on €2,360. Papers, People, Place and Plan B are green.",
    conditions: "One full month on four-fifths pay, with the rent and the bills paid out of it.",
    who_decided: "Me, with my sister. We agree.",
    first_step: "Ask my manager for a meeting about a four-day week.",
    first_step_date: "In the first week",
    review_when: "In 8 weeks",
    would_change: "A flat no from work with no room in it, or a month on the lower pay that does not add up.",
  },
  "s3-5.1": {
    steps: table([
      row(["step", "Ask my manager for a meeting"], ["first", "Nothing yet. This one is a conversation, not a request"], ["how_long", "One meeting"], ["start_by", "First week"]),
      row(["step", "Live on four-fifths pay on paper"], ["first", "Last three months of spending in front of me"], ["how_long", "2 weeks"], ["start_by", "First month"]),
      row(["step", "Put the request in writing"], ["first", "A yes in principle"], ["how_long", "My notice period"], ["start_by", "Second month"]),
      row(["step", "Take a corner of a neighbour's allotment"], ["first", "Tools and boots"], ["how_long", "A weekend"], ["start_by", "Third month"]),
      row(["step", "First Friday outdoors"], ["first", "The change in place"], ["how_long", "1 day"], ["start_by", "Fourth month"]),
    ]),
  },
  "s3-5.2": {
    income_after: "€2,360 a month from the fourth month, confirmed. €120 of weekend hours if I want them, not counted.",
    costs_change: "Transport drops by about €40. Going out drops by about €30. The allotment adds about €15.",
    buffer: "€6,600, three months of everything, untouched.",
    conversation: "My manager, about four days and what it does to my work. Then my team.",
    adviser_questions: "What four days does to my pension and my holiday days, and whether the request has to be permanent.",
  },
  "s3-5.3": {
    my_choice_hours: "About 16 hours a week now. About 26 after the change.",
    home_changes: "The spare corner becomes the place the tools live, so going out is easier than not going out.",
    must_dos: "Evening email stops. The weekly shop moves to Thursday market. Saturday catch-up work ends.",
    blocks_back: "Tuesday and Thursday evenings first. Then the whole of Friday.",
  },
  "s3-5.4": {
    who_i_tell: "My sister, now. My manager, in the first week. My team, once it is agreed.",
    what_i_need: "From my sister, a standing Friday so I do not waste the day indoors. From my manager, a straight answer.",
    who_already: "The neighbour who works four days and never mentions it. I will ask him what he does with the fifth.",
  },
  "s3-5.5": {
    week_one: "Ask for the meeting.",
    after_30: "Two evenings a week that really end at six, and one month of figures I believe.",
    after_90: "The request in writing, agreed, with a date on it.",
    say_no_to: "Evening email. Saturday catch-up. Any new thing that needs me after six.",
  },
  "s3-5.6": {
    check_in_dates: "the third month after the change, and again after a year",
  },
  change_plan: {
    the_change:
      "Four days a week in the same job, with Friday outdoors, and two evenings a week that end at six.",
    keep: "My job and the people in it, the flat, my sister ten minutes away, and the Thursday market.",
    in_place_date: "In the fourth month",
    small_test: "Four weeks of evenings that end at six, and one unpaid Friday, before I put the request in writing.",
    first_three:
      "Ask for the meeting, in the first week. Live on four-fifths pay on paper, in the first month. Put the request in writing with my notice period, in the second month.",
    income_buffer:
      "€2,360 a month from the fourth month, confirmed, against €2,210 of costs. The buffer stays at €6,600, three months of everything, untouched.",
    who_i_tell:
      "My sister first, then my manager, then the team. From my sister I need a standing Friday, so somebody is expecting me.",
    first_90:
      "Week one, the meeting. After 30 days, two evenings a week that really end at six. After 90 days, the request agreed and in writing.",
    uncertain:
      "What the lower pay does to my pension over ten years. Whether I keep the Friday in January, when it is dark and wet.",
    plan_b:
      "If four days is refused, I keep the two evenings and ask again after six months, with one unpaid day a month meanwhile. If the lower pay does not add up, I go back to five days for a season rather than spend the reserve.",
    check_in_dates: "the third month after the change, and again after a year",
  },

  /* The three named summary pages Step 1 carries. */
  life_picture: {
    responsible:
      "My own rent and bills. My share of looking after my sister's dog when she travels. Nobody depends on my income but me, which is why this is possible at all.",
    needs_patterns: "Daylight, something to do with my hands, and people a short walk away.",
    more_of: "Time outside. Evenings that belong to me.",
    keep: "My job and the people in it. My flat. My sister. The Thursday market.",
    essentials: "Daylight after work. One outdoor day. Rent I can pay. My sister nearby.",
    tensions: "I want more time and I do not want less money. Four days is me choosing which one wins.",
    unknowns: "Whether I use the time once I have it.",
  },
  starting_point: {
    today:
      "Nine hours a day in an office, two of them on things that could wait. Sixteen hours a week that are mine. A flat I like, with no outside space, in a town I do not want to leave.",
    time: "52 hours to work, 14 to screens, 10 to chores, 4 outside, 8 with people.",
    strengths: "I keep small promises. I am good at the work. I know everyone in three streets.",
    stopped_before: "I waited for the right moment, and I did not want to seem difficult at work.",
    beliefs_to_check: "That part-time means not serious. That my manager would say no.",
    unknowns: "Whether the problem is my hours or my habits.",
  },
  money_picture: {
    monthly_costs: "€2,285 today, €2,210 after the change.",
    one_time: "€690: two unpaid test Fridays, tools and boots, and the bike.",
    income_sure: "€2,360 on four days, confirmed.",
    income_hoped: "€120 of weekend hours at the nursery, if I want them.",
    first_check: "One month lived on €2,360 before I sign anything.",
    money_words: "Enough, with €150 to spare, and a reserve I do not touch.",
    unknowns: "What four days does to my pension.",
  },
  options: {
    keep: "The job, the flat, the town, my sister, the Thursday market.",
    let_go: "A fifth of my pay, evening email, and the idea that the life I want is abroad.",
    must_be_true: "My manager agrees, and one month on the lower pay adds up.",
    risks: "I get the time and waste it.",
    find_out: "Four weeks of evenings, and one month of figures.",
  },
};

const statuses = {};
for (const p of ["p0", "p1", "p2", "p3", "p4", "p5"]) statuses[`module:phase-1:step-1:${p}`] = "done";
for (const p of ["s2-p0", "s2-p3", "s2-p4", "s2-p5"]) statuses[`module:phase-1:step-2:${p}`] = "done";
for (const p of ["s3-p0", "s3-p1", "s3-p2", "s3-p3", "s3-p4", "s3-p5"]) statuses[`module:phase-1:step-3:${p}`] = "done";

const data = {
  signedIn: true,
  profile: {
    first_name: "Sam",
    language: "en",
    currency: "EUR",
    wants_updates: false,
  },
  answers,
  statuses,
  entitlements: [],
};

writeFileSync(process.argv[2], JSON.stringify(data), "utf8");
console.log("seeded", Object.keys(answers).length, "pages");
