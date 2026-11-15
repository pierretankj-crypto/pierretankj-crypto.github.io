// Case studies carried over from the previous portfolio.
const img = import.meta.glob('./assets/work/*.webp', { eager: true, query: '?url', import: 'default' });
const w = (name) => img[`./assets/work/${name}.webp`];

export const cases = [
  {
    id: 'ebo',
    kind: 'Industry case study · Tiger Analytics',
    label: 'Industry brief',
    title: 'Emerging Business Opportunities for a Food & Beverage Manufacturer',
    desc: 'Sales, social media and Google search data, used to find where a client’s Low Carb theme can grow and what really drives its sales.',
    tags: ['Python', 'pandas', 'Market analysis'],
    cover: w('ebo-cover'),
    intro: 'An individual industrial case study set by Tiger Analytics for a real food and beverage manufacturer (“Manufacturer A”). With six client datasets covering sales, social media and Google search across 208 consumer themes, I was assigned the Low Carb theme and asked where it is genuinely growing, how the client is positioned against competitors, and what drives its sales.',
    steps: [
      {
        title: 'The problem',
        text: 'Manufacturer A needed to know which of 208 consumer themes (Low Carb, GMO-Free, No Additives and more) were really growing, how its brand compared with competitors theme by theme, and whether sales followed social buzz, search interest or neither. Six datasets had to be cleaned and joined first: <b>4.53M sales rows, 533K social mentions and 181K search records</b>.',
        img: w('ebo-1'), alt: 'Business context slide listing the six client-provided datasets',
      },
      {
        title: 'Consumer preference by source',
        text: 'After cleaning and standardising the data, I ranked the top themes for each source. Low carb ranked <b>#2 in sales ($18.63B)</b> but did not make the top five on social media or search, an early sign that each source tells a different story about the same theme.',
        img: w('ebo-2'), alt: 'Top five consumer-preferred themes by sales, social mentions and Google search',
      },
      {
        title: 'Finding the real sales driver',
        text: 'Same-week correlation was weak, so I ran a lagged cross-correlation instead. Social media buzz leads Low Carb sales by <b>about 7 weeks (r = 0.34, statistically significant)</b>, a stronger and more useful signal than Google search, which peaked earlier and was not significant.',
        img: w('ebo-3'), alt: 'Same-week and lagged cross-correlation between social media, search and Low Carb sales',
      },
      {
        title: 'Market share landscape',
        text: 'Manufacturer A leads the overall market at <b>31.6% ($30.93B)</b>, and the top three vendors hold 66.4% between them, a moderately concentrated market. Within Low Carb the client ranks <b>#3 of 7 vendors at 13.1%</b>, which set up the competitor analysis that followed.',
        img: w('ebo-4'), alt: 'Pie chart of market share by sales dollar value across vendors',
      },
      {
        title: 'Strategic recommendation',
        text: 'For part two I built an opportunity-scoring framework across all 208 themes, filtering for market size, data reliability and verified positive growth. I recommended the client double down on <em>Protein</em>, <em>Low Sodium</em> and <em>Herbs</em>: the three highest-scoring themes where growth was both large and statistically real.',
        img: w('ebo-5'), alt: 'Top three recommended growth themes: Protein, Low Sodium and Herbs',
      },
    ],
  },
  {
    id: 'pd',
    kind: 'Applied machine learning · EG2A11',
    label: 'Machine learning',
    title: 'Parkinson’s Disease Classification: Decision Tree vs. Ensemble',
    desc: 'A Decision Tree and a Random Forest compared on voice recordings, with patient-grouped cross-validation so no patient leaks across folds.',
    tags: ['Python', 'scikit-learn', 'Machine learning'],
    cover: w('pd-cover'), coverFit: 'contain',
    intro: '195 voice recordings from 32 patients, 22 acoustic features, one question: Parkinson’s or healthy? The real challenge was not building the models. It was noticing that each patient has about six recordings, and making sure no patient’s data ever leaked across the train and validation split.',
    steps: [
      {
        title: 'A trap disguised as a dataset',
        text: '75% of recordings are Parkinson’s, so a classifier that always guesses “Parkinson’s” scores about 0.76 accuracy and 0.86 F1 while learning nothing. That ruled out accuracy and F1 as headline metrics. Everything here is judged on <b>ROC-AUC, PR-AUC and specificity</b>, where a useless model cannot hide.',
        img: w('pd-1'), alt: 'Class distribution: 147 Parkinson’s recordings against 48 healthy', fit: 'portrait',
      },
      {
        title: 'Cleaning, and the leakage discovery',
        text: 'Beyond the usual missing-value and outlier checks, the correlation heatmap surfaced two exactly collinear feature pairs. The bigger finding was structural: a naive stratified K-fold split leaks patient identity into every fold, inflating ROC-AUC from an honest <b>0.567</b> to an illusory <b>0.785</b> on the same untuned model. Every result after this uses patient-grouped cross-validation.',
        img: w('pd-2'), alt: 'Feature correlation heatmap across 22 acoustic measures',
      },
      {
        title: 'Model 1: Decision Tree',
        text: 'A single tree, tuned by grid search over depth, leaf size and cost-complexity pruning. Tuning made the pooled recording-level score look better, but at the patient level, the unit the model actually serves, the ranking reversed. The untuned depth cap was the regulariser doing the real work.',
        img: w('pd-3'), alt: 'Top three levels of the decision tree',
      },
      {
        title: 'Decision Tree diagnostics',
        text: 'Confusion matrices and ROC and precision-recall curves at recording level (n = 195) and patient level (n = 32), out of fold. Aggregating each patient’s recordings into one prediction lifts ROC-AUC from <b>0.736 to 0.844</b>, averaging out noisy readings the way the label was always meant to be judged.',
        img: w('pd-4'), alt: 'Decision Tree confusion matrices, ROC and precision-recall curves',
      },
      {
        title: 'Model 2: Random Forest ensemble',
        text: 'Random Forest was screened against Gradient Boosting and HistGradientBoosting across repeated grouped CV and won on mean score and stability, as expected on a small, noisy dataset where boosting overfits fast. Nested CV then gave an unbiased <b>0.797</b> (against an optimistic 0.953 from the naive split), confirming the ensemble beats the tree.',
        img: w('pd-5'), alt: 'Random Forest confusion matrices, ROC and precision-recall curves',
      },
    ],
  },
  {
    id: 'nesso',
    kind: 'IoT · team of four',
    label: 'IoT · Team',
    title: 'Worker Safety Monitor: NESSO Fall Detection',
    desc: 'Detecting falls and near misses on construction sites from a wearable sensor. I led data collection and cleaning and built the live Streamlit dashboard.',
    tags: ['Python', 'Streamlit', 'IoT'],
    cover: w('nesso-cover'),
    intro: 'A team IoT project detecting fall-from-height, slip-trip-fall and near-miss events on construction sites in real time, using a wearable NESSO N1 motion sensor. Our team of four built the pipeline from sensor to live dashboard. My part was data collection and cleaning, plus the web dashboard a supervisor watches.',
    steps: [
      {
        title: 'Collecting the data',
        text: 'The NESSO N1 sensor was strapped to four workers, each performing controlled normal, near-miss and fall-like movements at <b>25 Hz</b>, the balance point between catching sudden movement and keeping Bluetooth traffic manageable. Every recording was logged to CSV automatically with Python.',
        img: w('nesso-1'), alt: 'Data collection procedure: sensor setup and controlled movement recordings',
      },
      {
        title: 'Cleaning it',
        text: 'Each teammate’s recordings came with different column names and file conventions, so my pipeline standardised everything into one schema (Xg, Yg, Zg, Xdeg, Ydeg, Zdeg), checked all six sensor columns existed, converted values to numbers, removed corrupted or duplicate rows and merged it all into one labelled dataset.',
        img: w('nesso-2'), alt: 'Data cleaning pipeline: standardising columns, validating and merging recordings',
      },
      {
        title: 'The live dashboard',
        text: 'I built the Streamlit dashboard supervisors watch: live acceleration and gyroscope signals per worker, streamed once a second from the Bluetooth gateway, with the detector’s thresholds drawn as dashed lines so a spike shows the moment it happens.',
        img: w('nesso-3'), alt: 'Live dashboard with real-time acceleration and gyroscope signals for four workers',
      },
      {
        title: 'The incident log',
        text: 'Every triggered event, near miss or fall, is written to an incident log with its peak acceleration, gyroscope, jerk and rotation values, the worker and the device that reported it. It is the record a supervisor reviews afterwards to see exactly what happened and when.',
        img: w('nesso-4'), alt: 'Incident log table of near-miss and fall events with peak signal values',
      },
      {
        title: 'Where I would take it next',
        text: 'My proposed extension is indoor location tracking: estimating each worker’s position from Bluetooth signal strength across three or more fixed anchors, so an alert says where as well as who. This is a concept mock-up with simulated positions; the real version needs anchor hardware we have not bought yet.',
        img: w('nesso-5'), alt: 'Concept: indoor location tracking with Bluetooth anchor trilateration',
      },
    ],
  },
  {
    id: 'cyber',
    kind: 'Data security & management · individual',
    label: 'Security · Individual',
    title: 'Cyber Risk Surveillance: Grab Holdings Case Study',
    desc: 'A consultancy-style audit of a regional super-app’s top cyber risks, with technical and administrative controls to close the gaps.',
    tags: ['Cyber security', 'Risk analysis', 'Consulting'],
    cover: w('cyber-cover'),
    intro: 'Acting as a consultancy (“Security Incto”), I ran a cyber risk audit of Grab Holdings, a Southeast Asian super-app spanning mobility, delivery and fintech, and proposed a defence-in-depth strategy covering technical and administrative controls.',
    steps: [
      {
        title: 'Risk 1: AI-driven phishing',
        text: 'Generative AI lets attackers write hyper-personalised phishing emails and clone executives’ voices, aimed straight at finance authorisation workflows. Threat intelligence showed roughly a <b>4,000% rise</b> in AI-generated spear-phishing against the Southeast Asian tech sector since 2023, the most alarming number in the audit.',
        img: w('cyber-1'), alt: 'Risk 1: AI-driven phishing, with a 4,000 percent surveillance finding',
      },
      {
        title: 'Where the gaps are',
        text: 'I mapped current state against required state across four domains. The most urgent: encryption keys often stored in code repositories instead of a managed vault, a critical gap I flagged for <b>remediation within 30 days</b>, ahead of network segmentation, AI model testing and vendor risk monitoring.',
        img: w('cyber-2'), alt: 'Security posture gap analysis across four domains',
      },
      {
        title: 'Technical control: Zero Trust',
        text: 'My core recommendation was a Zero Trust Architecture built on <b>NIST SP 800-207</b>: every access request verified regardless of network origin, combining micro-segmentation, phishing-resistant MFA, device posture checks and an encrypted data plane.',
        img: w('cyber-3'), alt: 'Zero Trust Architecture covering micro-segmentation, identity and device trust',
      },
      {
        title: 'Turning it into a plan',
        text: 'Recommendations only matter if someone can act on them, so I phased everything into a 2025–26 roadmap: foundation and ZTA audit first, then technical controls, then governance, then continuous optimisation, with targets such as <b>MTTD under 2 minutes</b> and <b>100% MFA adoption</b>.',
        img: w('cyber-4'), alt: 'Implementation roadmap for 2025 to 2026 across four phases',
      },
    ],
  },
  {
    id: 'eco',
    kind: 'Data preparation & visualisation · EG2A12 · team of five',
    label: 'Data viz · Team',
    title: 'EcoWaste: Singapore Recycling Analytics',
    desc: 'Singapore’s waste and recycling trends through CRISP-DM. I built the recycling-rate dashboard and traced three causes behind its decline.',
    tags: ['Python', 'Power BI', 'CRISP-DM'],
    cover: w('eco-cover'),
    intro: 'One question: how can Singapore improve its waste management and recycling efficiency? Our team of five applied CRISP-DM to local and international waste datasets in Python and Power BI. My dashboard tracked Singapore’s recycling rate and waste-type breakdown; below are the three cause-and-effect stories I found in it, and the cleaning behind them.',
    steps: [
      {
        title: 'Why the recycling rate is falling',
        text: '<b>Cause:</b> post-COVID freight costs rose and export demand for recyclables weakened (MSE, parliamentary reply on the domestic recycling rate). <b>Effect:</b> the overall rate fell from a peak of about <em>31.1%</em> around 2018–19 to <em>21.6%</em> in 2024, roughly 10 points in five to six years.',
        img: w('eco-1'), alt: 'Recycling rate trend from 2000 to 2024, dropping from 31.1% to 21.6%',
      },
      {
        title: 'Disposal climbs while recycling stalls',
        text: '<b>Cause:</b> waste generation kept rising while recycling stayed flat (NEA). <b>Effect:</b> total disposed volume rose from about <em>2.6M to 3.1M tonnes</em>, while total recycled stayed near 0.8M tonnes.',
        img: w('eco-2'), alt: 'Disposed against recycled waste from 2000 to 2024',
      },
      {
        title: 'Plastic: high volume, lowest rate',
        text: '<b>Cause:</b> bin contamination (up to 40% rejected) plus shrinking export markets after import restrictions in China and Indonesia. <b>Effect:</b> plastic is one of Singapore’s largest waste categories and has the lowest recycling rate on the dashboard, at <em>4.70%</em>.',
        img: w('eco-3'), alt: 'Recycling rate by waste type, with plastic at 4.70%',
      },
      {
        title: 'Before: the raw NEA dataset',
        text: 'The raw file from data.gov.sg: wide format, one row per waste category per year, indented sub-categories, and missing values written as the string “na” instead of a blank cell. It had to become a tidy table before any analysis could start.',
        img: w('eco-4'), alt: 'Raw NEA dataset in wide format',
      },
      {
        title: 'Cleaning it in Python',
        text: 'The core of the pipeline: <b>melt()</b> reshapes the wide file into one row per category and year, then <b>pd.to_numeric(…, errors=\'coerce\')</b> turns the stray “na” strings into proper NaNs so they are never silently counted as zero.',
        img: w('eco-5'), alt: 'Python code melting the raw data and coercing missing values', fit: 'dark',
      },
      {
        title: 'After: the cleaned dataset',
        text: 'The pipeline’s output: a tidy year-by-material table limited to household waste, with totals and the recycling rate recalculated from those categories only. This is what went into Power BI.',
        img: w('eco-6'), alt: 'Cleaned recycling data by material type',
      },
      {
        title: 'Presenting the findings',
        text: 'Walking the class through my recycling-rate insight at our final presentation, connecting the dashboard back to the cause (post-COVID freight costs and weaker export demand) and the effect (a 10-point drop in the recycling rate).',
        img: w('eco-7'), alt: 'Pierre presenting the cause-and-effect findings to the class', fit: 'portrait',
      },
    ],
  },
];
