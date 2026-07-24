export const Endpoints = {
  auth: {
    register: '/api/auth/register',
  },

  // ─── Notifications ──────────────────────────────────────────────────────────
  notifications: {
    list:      (page = 1, limit = 20) => `/api/notifications?page=${page}&limit=${limit}`,
    markRead:  (id: string)           => `/api/notifications/${id}/read`,
    markAllRead: ()                   => `/api/notifications/read-all`,
    delete:    (id: string)           => `/api/notifications/${id}`,
  },

  // ─── Comments ───────────────────────────────────────────────────────────────
  comments: {
    list:   (entityType: string, entityId: string) => `/api/comments?entityType=${entityType}&entityId=${entityId}`,
    create: ()                                      => `/api/comments`,
    update: (commentId: string)                    => `/api/comments/${commentId}`,
    delete: (commentId: string)                    => `/api/comments/${commentId}`,
  },

  // ─── Attachments ────────────────────────────────────────────────────────────
  attachments: {
    list:     (entityType: string, entityId: string) => `/api/attachments?entityType=${entityType}&entityId=${entityId}`,
    upload:   ()                                      => `/api/attachments`,
    download: (attachmentId: string)                  => `/api/attachments/${attachmentId}/download`,
    delete:   (attachmentId: string)                  => `/api/attachments/${attachmentId}`,
  },

  // ─── Tags ───────────────────────────────────────────────────────────────────
  tags: {
    list:     (projectId: string)                     => `/api/projects/${projectId}/tags`,
    create:   (projectId: string)                     => `/api/projects/${projectId}/tags`,
    assign:   (projectId: string, tagId: string)      => `/api/projects/${projectId}/tags/${tagId}/assign`,
    unassign: (projectId: string, tagId: string)      => `/api/projects/${projectId}/tags/${tagId}/unassign`,
    delete:   (projectId: string, tagId: string)      => `/api/projects/${projectId}/tags/${tagId}`,
    search:   (projectId: string, q: string)          => `/api/projects/${projectId}/tags?q=${encodeURIComponent(q)}`,
  },

  // ─── Favorites ──────────────────────────────────────────────────────────────
  favorites: {
    list:   ()                    => `/api/favorites`,
    add:    ()                    => `/api/favorites`,
    remove: (favoriteId: string) => `/api/favorites/${favoriteId}`,
  },

  // ─── User Preferences ───────────────────────────────────────────────────────
  preferences: {
    get:    () => `/api/user/preferences`,
    update: () => `/api/user/preferences`,
  },

  // ─── API Keys ───────────────────────────────────────────────────────────────
  apiKeys: {
    list:   ()                 => `/api/user/api-keys`,
    create: ()                 => `/api/user/api-keys`,
    rotate: (keyId: string)   => `/api/user/api-keys/${keyId}/rotate`,
    revoke: (keyId: string)   => `/api/user/api-keys/${keyId}/revoke`,
    delete: (keyId: string)   => `/api/user/api-keys/${keyId}`,
    activity: (keyId: string) => `/api/user/api-keys/${keyId}/activity`,
  },

  // ─── Activity Feed ──────────────────────────────────────────────────────────
  activityFeed: {
    list: (params?: string) => `/api/activity${params ? `?${params}` : ''}`,
  },

  invite: {
    byToken: (token: string) => `/api/invite/${token}`,
  },
  projects: {
    list: '/api/projects',
    create: '/api/projects',
    get: (projectId: string) => `/api/projects/${projectId}`,
    assets: {
      list: (projectId: string) => `/api/projects/${projectId}/assets`,
      create: (projectId: string) => `/api/projects/${projectId}/assets`,
      import: (projectId: string) => `/api/projects/${projectId}/assets/import`,
      get: (projectId: string, assetId: string) => `/api/projects/${projectId}/assets/${assetId}`,
      update: (projectId: string, assetId: string) => `/api/projects/${projectId}/assets/${assetId}`,
      delete: (projectId: string, assetId: string) => `/api/projects/${projectId}/assets/${assetId}`,
    },
    captureSession: {
      get: (projectId: string) => `/api/projects/${projectId}/capture-session`,
      update: (projectId: string) => `/api/projects/${projectId}/capture-session`,
      delete: (projectId: string) => `/api/projects/${projectId}/capture-session`,
    },
    scans: {
      list: (projectId: string) => `/api/projects/${projectId}/scans`,
      create: (projectId: string) => `/api/projects/${projectId}/scans`,
    },
    notes: {
      get: (projectId: string) => `/api/projects/${projectId}/notes`,
      update: (projectId: string) => `/api/projects/${projectId}/notes`,
    },
    findings: {
      list: (projectId: string) => `/api/projects/${projectId}/findings`,
      create: (projectId: string) => `/api/projects/${projectId}/findings`,
      get: (projectId: string, findingId: string) => `/api/projects/${projectId}/findings/${findingId}`,
      update: (projectId: string, findingId: string) => `/api/projects/${projectId}/findings/${findingId}`,
      delete: (projectId: string, findingId: string) => `/api/projects/${projectId}/findings/${findingId}`,
    },
    members: {
      list: (projectId: string) => `/api/projects/${projectId}/members`,
      create: (projectId: string) => `/api/projects/${projectId}/members`,
      update: (projectId: string, memberId: string) => `/api/projects/${projectId}/members/${memberId}`,
      delete: (projectId: string, memberId: string) => `/api/projects/${projectId}/members/${memberId}`,
      deleteInvite: (projectId: string, inviteId: string) => `/api/projects/${projectId}/members/invites/${inviteId}`,
    },
    timeline: {
      get: (projectId: string) => `/api/projects/${projectId}/timeline`,
      create: (projectId: string) => `/api/projects/${projectId}/timeline`,
    },
    search: {
      query: (projectId: string) => `/api/projects/${projectId}/search`,
    },
    reports: {
      list:     (projectId: string)             => `/api/projects/${projectId}/reports`,
      generate: (projectId: string)             => `/api/projects/${projectId}/reports/generate`,
      get:      (projectId: string, id: string) => `/api/projects/${projectId}/reports/${id}`,
      delete:   (projectId: string, id: string) => `/api/projects/${projectId}/reports/${id}`,
    },
    copilot: {
      ask: (projectId: string) => `/api/projects/${projectId}/copilot`,
    },
  },
  knowledge: {
    mitre: {
      list: (projectId: string) => `/api/projects/${projectId}/knowledge/mitre`,
      get: (projectId: string, techniqueId: string) => `/api/projects/${projectId}/knowledge/mitre/${techniqueId}`,
    },
    cve: {
      list: (projectId: string) => `/api/projects/${projectId}/knowledge/cve`,
      get: (projectId: string, cveId: string) => `/api/projects/${projectId}/knowledge/cve/${cveId}`,
    },
    ioc: {
      list: (projectId: string) => `/api/projects/${projectId}/knowledge/ioc`,
    },
    threats: {
      list: (projectId: string) => `/api/projects/${projectId}/knowledge/threats`,
    },
    campaigns: {
      list: (projectId: string) => `/api/projects/${projectId}/knowledge/campaigns`,
    },
    graph: (projectId: string) => `/api/projects/${projectId}/knowledge/graph`,
    search: (projectId: string) => `/api/projects/${projectId}/knowledge/search`,
    searchKnowledge: (projectId: string) => `/api/projects/${projectId}/knowledge/search`,
    utkg: {
      visualization: (fmt = 'react_flow', centerNodeId?: string, depth = 2, maxNodes = 200) =>
        `/intelligence/graph/visualization?fmt=${fmt}&depth=${depth}&max_nodes=${maxNodes}${centerNodeId ? `&center_node_id=${encodeURIComponent(centerNodeId)}` : ''}`,
      node: (nodeId: string) => `/intelligence/graph/node/${encodeURIComponent(nodeId)}`,
      neighbors: (nodeId: string, direction = 'both', limit = 100) =>
        `/intelligence/graph/node/${encodeURIComponent(nodeId)}/neighbors?direction=${direction}&limit=${limit}`,
      search: (q: string, nodeType?: string, minConfidence?: number) =>
        `/intelligence/graph/search?q=${encodeURIComponent(q)}${nodeType ? `&node_type=${encodeURIComponent(nodeType)}` : ''}${minConfidence !== undefined ? `&min_confidence=${minConfidence}` : ''}`,
      subgraph: (centerNodeId?: string, nodeIds?: string[], depth = 2) =>
        `/intelligence/graph/subgraph?depth=${depth}${centerNodeId ? `&center_node_id=${encodeURIComponent(centerNodeId)}` : ''}${nodeIds ? `&node_ids=${encodeURIComponent(nodeIds.join(','))}` : ''}`,
      traverse: (nodeId: string, algorithm = 'bfs', maxDepth = 3) =>
        `/intelligence/graph/traverse?node_id=${encodeURIComponent(nodeId)}&algorithm=${algorithm}&max_depth=${maxDepth}`,
      path: (source: string, target: string, algorithm = 'shortest') =>
        `/intelligence/graph/path?source=${encodeURIComponent(source)}&target=${encodeURIComponent(target)}&algorithm=${algorithm}`,
      statistics: (recompute = false) => `/intelligence/graph/statistics?recompute=${recompute}`,
      attackChain: (nodeId: string) => `/intelligence/graph/query/attack-chain/${encodeURIComponent(nodeId)}`,
      aiExpand: (nodeId: string, depth = 2) => `/intelligence/graph/ai/expand-context/${encodeURIComponent(nodeId)}?depth=${depth}`,
      aiRelated: (nodeId: string, targetType: string) => `/intelligence/graph/ai/related-entities/${encodeURIComponent(nodeId)}?target_type=${encodeURIComponent(targetType)}`,
      fusion: () => `/intelligence/graph/fusion`,
    },
  },
  workflow: {
    // Playbooks
    playbooks: {
      list: (projectId: string) => `/api/projects/${projectId}/workflow/playbooks`,
      create: (projectId: string) => `/api/projects/${projectId}/workflow/playbooks`,
      get: (projectId: string, playbookId: string) => `/api/projects/${projectId}/workflow/playbooks/${playbookId}`,
      update: (projectId: string, playbookId: string) => `/api/projects/${projectId}/workflow/playbooks/${playbookId}`,
      delete: (projectId: string, playbookId: string) => `/api/projects/${projectId}/workflow/playbooks/${playbookId}`,
      duplicate: (projectId: string, playbookId: string) => `/api/projects/${projectId}/workflow/playbooks/${playbookId}/duplicate`,
      execute: (projectId: string, playbookId: string) => `/api/projects/${projectId}/workflow/playbooks/${playbookId}/execute`,
      enable: (projectId: string, playbookId: string) => `/api/projects/${projectId}/workflow/playbooks/${playbookId}/enable`,
      disable: (projectId: string, playbookId: string) => `/api/projects/${projectId}/workflow/playbooks/${playbookId}/disable`,
      archive: (projectId: string, playbookId: string) => `/api/projects/${projectId}/workflow/playbooks/${playbookId}/archive`,
    },
    // Rules
    rules: {
      list: (projectId: string) => `/api/projects/${projectId}/workflow/rules`,
      create: (projectId: string) => `/api/projects/${projectId}/workflow/rules`,
      get: (projectId: string, ruleId: string) => `/api/projects/${projectId}/workflow/rules/${ruleId}`,
      update: (projectId: string, ruleId: string) => `/api/projects/${projectId}/workflow/rules/${ruleId}`,
      delete: (projectId: string, ruleId: string) => `/api/projects/${projectId}/workflow/rules/${ruleId}`,
      enable: (projectId: string, ruleId: string) => `/api/projects/${projectId}/workflow/rules/${ruleId}/enable`,
      disable: (projectId: string, ruleId: string) => `/api/projects/${projectId}/workflow/rules/${ruleId}/disable`,
    },
    // Automations
    automations: {
      list: (projectId: string) => `/api/projects/${projectId}/workflow/automations`,
      get: (projectId: string, automationId: string) => `/api/projects/${projectId}/workflow/automations/${automationId}`,
      trigger: (projectId: string) => `/api/projects/${projectId}/workflow/automations`,
      stop: (projectId: string, automationId: string) => `/api/projects/${projectId}/workflow/automations/${automationId}/stop`,
      retry: (projectId: string, automationId: string) => `/api/projects/${projectId}/workflow/automations/${automationId}/retry`,
      resume: (projectId: string, automationId: string) => `/api/projects/${projectId}/workflow/automations/${automationId}/resume`,
      cancel: (projectId: string, automationId: string) => `/api/projects/${projectId}/workflow/automations/${automationId}/cancel`,
      logs: (projectId: string, automationId: string) => `/api/projects/${projectId}/workflow/automations/${automationId}/logs`,
    },
    // Cases
    cases: {
      list: (projectId: string) => `/api/projects/${projectId}/workflow/cases`,
      create: (projectId: string) => `/api/projects/${projectId}/workflow/cases`,
      get: (projectId: string, caseId: string) => `/api/projects/${projectId}/workflow/cases/${caseId}`,
      update: (projectId: string, caseId: string) => `/api/projects/${projectId}/workflow/cases/${caseId}`,
      delete: (projectId: string, caseId: string) => `/api/projects/${projectId}/workflow/cases/${caseId}`,
      close: (projectId: string, caseId: string) => `/api/projects/${projectId}/workflow/cases/${caseId}/close`,
      reopen: (projectId: string, caseId: string) => `/api/projects/${projectId}/workflow/cases/${caseId}/reopen`,
      tasks: {
        list: (projectId: string, caseId: string) => `/api/projects/${projectId}/workflow/cases/${caseId}/tasks`,
        create: (projectId: string, caseId: string) => `/api/projects/${projectId}/workflow/cases/${caseId}/tasks`,
        update: (projectId: string, caseId: string, taskId: string) => `/api/projects/${projectId}/workflow/cases/${caseId}/tasks/${taskId}`,
        delete: (projectId: string, caseId: string, taskId: string) => `/api/projects/${projectId}/workflow/cases/${caseId}/tasks/${taskId}`,
      },
      notes: {
        list: (projectId: string, caseId: string) => `/api/projects/${projectId}/workflow/cases/${caseId}/notes`,
        create: (projectId: string, caseId: string) => `/api/projects/${projectId}/workflow/cases/${caseId}/notes`,
        delete: (projectId: string, caseId: string, noteId: string) => `/api/projects/${projectId}/workflow/cases/${caseId}/notes/${noteId}`,
      },
    },
    // Executions — scoped to a playbook (backend: GET /api/v2/workflow/playbooks/{playbookId}/executions)
    executions: {
      list: (projectId: string, playbookId?: string) =>
        playbookId
          ? `/api/projects/${projectId}/workflow/playbooks/${playbookId}/executions`
          : `/api/projects/${projectId}/workflow/executions`,
      get: (projectId: string, executionId: string) => `/api/projects/${projectId}/workflow/executions/${executionId}`,
      logs: (projectId: string, executionId: string) => `/api/projects/${projectId}/workflow/executions/${executionId}/logs`,
      variables: (projectId: string, executionId: string) => `/api/projects/${projectId}/workflow/executions/${executionId}/variables`,
      artifacts: (projectId: string, executionId: string) => `/api/projects/${projectId}/workflow/executions/${executionId}/artifacts`,
      stepOutputs: (projectId: string, executionId: string) => `/api/projects/${projectId}/workflow/executions/${executionId}/step-outputs`,
    },
    statistics: (projectId: string) => `/api/projects/${projectId}/workflow/statistics`,
  },
  agent: {
    interfaces: '/capture/interfaces',
    analyzeCapture: '/capture/analyze',
    riskRanking: '/capture/risk-ranking',
    pcapSummary: '/pcap/summary',
    pcapAnalyze: '/pcap/analyze',
    pcapPackets: '/pcap/packets',
    packetDetails: '/pcap/packet-details',
    followStream: '/pcap/follow-stream',
    dns: '/pcap/dns',
    findings: '/pcap/findings',
    iocs: '/pcap/iocs',
    ipInfo: (ip: string) => `/ip/info?ip=${ip}`,
    ipReputation: (ip: string) => `/ip/reputation?ip=${ip}`,
    scan: '/scan',
    reportGenerate: '/report/generate',
    reportPdf: '/report/pdf',
    reportExportPdf: '/report/export-pdf',
    aiInvestigate: '/ai/investigate',
    aiDeviceProfile: '/ai/device-profile',
    aiInvestigationPlan: '/ai/investigation-plan',
    aiAttackStory: '/ai/attack-story',
    captureSession: (projectId: string) => `/capture/session/${projectId}`,
    downloadCapture: '/capture/download',
    atre: {
      query: '/reasoning/query',
      hypothesis: '/reasoning/hypothesis',
      explain: '/reasoning/explain',
      risk: '/reasoning/risk',
      attackChain: '/reasoning/attack-chain',
      recommendations: '/reasoning/recommendations',
      timeline: '/reasoning/timeline',
      report: '/reasoning/report',
      history: (limit = 50) => `/reasoning/history?limit=${limit}`,
      statistics: '/reasoning/statistics',
      trace: (sessionId: string) => `/reasoning/trace/${encodeURIComponent(sessionId)}`,
      traceTimeline: (sessionId: string) => `/reasoning/trace/${encodeURIComponent(sessionId)}/timeline`,
      traceGraph: (sessionId: string) => `/reasoning/trace/${encodeURIComponent(sessionId)}/graph`,
      traceConfidence: (sessionId: string) => `/reasoning/trace/${encodeURIComponent(sessionId)}/confidence`,
      traceDecisions: (sessionId: string) => `/reasoning/trace/${encodeURIComponent(sessionId)}/decisions`,
      traceExport: (sessionId: string, format = 'json') => `/reasoning/trace/${encodeURIComponent(sessionId)}/export?format=${format}`,
    },
  }
};

