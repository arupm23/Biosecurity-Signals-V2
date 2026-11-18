// Shared public safeguard classification. A tag indicates a reported signal,
// not proof of implementation, effectiveness, or safety.
window.BIOSECURITY_LAYERS = [
  { key: "development", label: "Data & development", description: "Data sourcing, filtering, and assessment during model development." },
  { key: "evaluation", label: "Evaluation & testing", description: "Documented risk assessment, expert input, evaluations, and testing." },
  { key: "release", label: "Release & access", description: "Distribution, use restrictions, licensing, and access mechanisms." },
  { key: "governance", label: "Governance & monitoring", description: "Transparency, oversight, community engagement, and post-release practices." },
  { key: "other", label: "Other reported practices", description: "Additional safeguards not yet assigned to a lifecycle layer." }
];
window.BIOSECURITY_TAXONOMY = {
  "Dual-use statement": "governance",
  "Expert engagement": "evaluation",
  "Risk evaluation": "evaluation",
  "Access controls": "release",
  "Use policy": "release",
  "Monitoring": "governance",
  "Training-data curation": "development",
  "Red teaming": "evaluation",
  "Published results": "evaluation",
  "Model-card disclosure": "governance",
  "Ethical-use terms": "release",
  "Feedback channel": "governance",
  "Public documentation": "governance",
  "Training-data analysis": "development",
  "Staged release": "release",
  "Information-hazard review": "governance",
  "Recommendations": "governance",
  "Community engagement": "governance",
  "Technical safeguards": "evaluation",
  "Governance": "governance",
  "Risk assessment": "evaluation",
  "Information security": "governance",
  "Institutional oversight": "governance"
};
