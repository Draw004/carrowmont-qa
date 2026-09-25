export const standardDownloadMessage = 'Report has been downloaded.';

export const tools = [
  {
    key: 'financial-independence',
    name: 'Financial Independence',
    path: '/financial-independence/',
    reportButton: '#reportBtn',
    reportStatus: '#reportDownloadStatus',
    reportMinPages: 5,
    charts: ['#pathChart', '#growthChart'],
    requiredText: ['Financial Independence', 'Copy Summary', 'Generate Financial Independence Report'],
    keyInputs: ['#currentAge', '#targetAge', '#monthlySpending', '#withdrawalRate', '#inflation'],
    layoutParent: '.snapshot-actions',
    requiresGuideReportPage: true,
    requiresToolsReportPage: true
  },
  {
    key: 'goal-planner',
    name: 'Goal Planner',
    path: '/goal-planner/',
    reportButton: '#reportBtn',
    reportStatus: '#reportDownloadStatus',
    reportMinPages: 5,
    charts: ['#costChart', '#savingsChart'],
    requiredText: ['Goal Planner', 'Copy Summary', 'Generate Goal Report'],
    keyInputs: ['#years', '#amountToday', '#inflationRate', '#existingSavings', '#monthlyContribution', '#payFrequency', '#contributionFrequency'],
    layoutParent: '.snapshot-actions',
    requiresGuideReportPage: true,
    requiresToolsReportPage: true
  },
  {
    key: 'inflation-calculator',
    name: 'Inflation Calculator',
    path: '/inflation-calculator/',
    reportButton: '#printReportBtn',
    reportStatus: '#reportDownloadStatus',
    reportMinPages: 4,
    charts: ['#inflationChart'],
    requiredText: ['Inflation Calculator', 'Copy Summary', 'Generate Inflation Report'],
    keyInputs: ['#amountInput', '#yearsInput', '#inflationInput'],
    layoutParent: '.action-row',
    requiresGuideReportPage: true,
    requiresToolsReportPage: true
  },
  {
    key: 'retirement-planner',
    name: 'Retirement Planner',
    path: '/retirement-calculator/planner.html',
    reportButton: '#printBtn',
    reportStatus: '#reportStatus',
    reportMinPages: 5,
    charts: ['#expenseChart', '#portfolioChart'],
    requiredText: ['Copy Summary', 'Generate Retirement Report'],
    keyInputs: ['#currentAge', '#retirementAge', '#planningAge', '#currentSavings', '#quickMonthlyExpense'],
    layoutParent: '.result-actions',
    requiresGuideReportPage: true,
    requiresToolsReportPage: true
  },
  {
    key: 'sip-calculator',
    name: 'SIP Calculator',
    path: '/sip-calculator/',
    reportButton: '#reportBtn',
    reportStatus: '#reportDownloadStatus',
    reportMinPages: 6,
    charts: ['#chart1', '#chart2'],
    requiredText: ['SIP Calculator', 'Copy Summary', 'Generate SIP Report'],
    keyInputs: ['#currentSavings', '#monthlySIP', '#contributionFrequency', '#years', '#annualReturn', '#annualStepUp'],
    layoutParent: '.snapshot-actions',
    requiresGuideReportPage: true,
    requiresToolsReportPage: true
  }
];

export const mainSitePages = [
  { key: 'home', path: '/', text: 'Want to build' },
  { key: 'about', path: '/about.html', text: 'SIP Calculator' },
  { key: 'learn', path: '/learn.html', text: 'PLANNING TOPICS' },
  { key: 'methodology', path: '/methodology.html', text: 'Methodology' }
];
