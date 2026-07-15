"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

interface Props {
  projectId: string;
}

const navSections = [
  {
    title: "CASE",
    items: [
      {
        label: "Investigation Workspace",
        href: "",
        icon: (
          <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8.522.5a.75.75 0 0 0-1.044 0L.5 7.22a.75.75 0 0 0 1.044 1.08L2 7.86V14.5a.75.75 0 0 0 .75.75h4a.75.75 0 0 0 .75-.75v-3.5h1v3.5a.75.75 0 0 0 .75.75h4a.75.75 0 0 0 .75-.75V7.86l.456.44a.75.75 0 0 0 1.044-1.08L8.522.5ZM8 2.158l4.5 4.33V14h-2.5v-3.5a.75.75 0 0 0-.75-.75h-2.5a.75.75 0 0 0-.75.75V14H3.5V6.488L8 2.158Z" />
          </svg>
        ),
      },
    ],
  },
  {
    title: "EVIDENCE",
    items: [
      {
        label: "Assets",
        href: "/assets",
        icon: (
          <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm4.879-2.773 4.264 2.559a.25.25 0 0 1 0 .428l-4.264 2.559A.25.25 0 0 1 6 10.559V5.442a.25.25 0 0 1 .379-.215Z" />
          </svg>
        ),
      },
      {
        label: "Findings",
        href: "/findings",
        icon: (
          <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 1a7 7 0 1 1 0 14A7 7 0 0 1 8 1ZM8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0Zm.75 4.75a.75.75 0 0 0-1.5 0v3.5a.75.75 0 0 0 .75.75h2.5a.75.75 0 0 0 0-1.5H8.75v-2.75Zm0 6.5a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z" />
          </svg>
        ),
      },
      {
        label: "Timeline",
        href: "/timeline",
        icon: (
          <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm7-3.25v2.992l2.028.812a.75.75 0 0 1-.557 1.392l-2.5-1A.751.751 0 0 1 7 8.25v-3.5a.75.75 0 0 1 1.5 0Z" />
          </svg>
        ),
      },
      {
        label: "Notes",
        href: "/notes",
        icon: (
          <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
            <path d="M0 3.75A.75.75 0 0 1 .75 3h14.5a.75.75 0 0 1 0 1.5H.75A.75.75 0 0 1 0 3.75Zm0 4A.75.75 0 0 1 .75 7h14.5a.75.75 0 0 1 0 1.5H.75A.75.75 0 0 1 0 7.75Zm0 4a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5a.75.75 0 0 1-.75-.75Z" />
          </svg>
        ),
      },
    ],
  },
  {
    title: "NETWORK",
    items: [
      {
        label: "Scans",
        href: "/scans",
        icon: (
          <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 1.5a6.5 6.5 0 1 0 6.5 6.5A6.507 6.507 0 0 0 8 1.5Zm0-1.5a8 8 0 1 1 0 16A8 8 0 0 1 8 0Zm0 3a.75.75 0 0 1 .75.75V8h2.75a.75.75 0 0 1 0 1.5H8A.75.75 0 0 1 7.25 8V3.75A.75.75 0 0 1 8 3Z" />
          </svg>
        ),
      },
      {
        label: "Live Capture",
        href: "/capture",
        icon: (
          <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm3.75.75a2.75 2.75 0 1 1 5.5 0 2.75 2.75 0 0 1-5.5 0Z" />
          </svg>
        ),
      },
      {
        label: "PCAP Analysis",
        href: "/pcap",
        icon: (
          <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
            <path d="M2 2h12v12H2z" />
          </svg>
        ),
      },
      {
        label: "Traffic Intelligence",
        href: "/traffic",
        icon: (
          <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
            <path d="M1 11.5a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Zm0-7a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Zm11 0a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Zm0 7a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0ZM4 11.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5Zm0-7a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5Zm4-3a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm0 10a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm0-9a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 .5-.5Z" />
          </svg>
        ),
      },
    ],
  },
  {
    title: "INTELLIGENCE",
    items: [
      {
        label: "MITRE ATT&CK",
        href: "/knowledge/mitre",
        icon: (
          <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm4.879-2.773 4.264 2.559a.25.25 0 0 1 0 .428l-4.264 2.559A.25.25 0 0 1 6 10.559V5.442a.25.25 0 0 1 .379-.215Z" />
          </svg>
        ),
      },
      {
        label: "CVE Explorer",
        href: "/knowledge/cve",
        icon: (
          <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 1a7 7 0 1 1 0 14A7 7 0 0 1 8 1ZM8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0Zm.75 4.75a.75.75 0 0 0-1.5 0v3.5a.75.75 0 0 0 .75.75h2.5a.75.75 0 0 0 0-1.5H8.75v-2.75Zm0 6.5a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z" />
          </svg>
        ),
      },
      {
        label: "IOC Explorer",
        href: "/knowledge/ioc",
        icon: (
          <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
            <path d="M10.68 11.74a6 6 0 0 1-7.922-8.982 6 6 0 0 1 8.982 7.922l3.04 3.04a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215ZM11.5 7a4.499 4.499 0 1 0-8.997 0A4.499 4.499 0 0 0 11.5 7Z" />
          </svg>
        ),
      },
      {
        label: "Threat Actors",
        href: "/knowledge/threats",
        icon: (
          <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
            <path d="M10.5 5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Zm.061 3.073a4 4 0 1 0-5.123 0 6.004 6.004 0 0 0-3.431 5.142.75.75 0 0 0 1.498.07 4.5 4.5 0 0 1 8.99 0 .75.75 0 1 0 1.498-.07 6.005 6.005 0 0 0-3.432-5.142Z" />
          </svg>
        ),
      },
      {
        label: "Campaigns",
        href: "/knowledge/campaigns",
        icon: (
          <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
            <path d="M1.5 1.75V13.5h13.75a.75.75 0 0 1 0 1.5H.75a.75.75 0 0 1-.75-.75V1.75a.75.75 0 0 1 1.5 0Zm14.28 2.53-5.25 5.25a.75.75 0 0 1-1.06 0L7 7.06 4.28 9.78a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042l3.25-3.25a.75.75 0 0 1 1.06 0L9 7.94l4.72-4.72a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042Z" />
          </svg>
        ),
      },
      {
        label: "Correlation Graph",
        href: "/knowledge/graph",
        icon: (
          <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
            <path d="M6 2a4 4 0 0 1 4 4c0 .711-.186 1.381-.511 1.962L11.946 9.4A4.5 4.5 0 1 1 9.4 11.946l-1.438-1.457A4 4 0 1 1 6 2Zm0 1.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Zm6.5 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
          </svg>
        ),
      },
      {
        label: "Knowledge Search",
        href: "/knowledge/search",
        icon: (
          <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
            <path d="M10.68 11.74a6 6 0 0 1-7.922-8.982 6 6 0 0 1 8.982 7.922l3.04 3.04a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215ZM11.5 7a4.499 4.499 0 1 0-8.997 0A4.499 4.499 0 0 0 11.5 7Z" />
          </svg>
        ),
      },
    ],
  },
  {
    title: "WORKFLOW",
    items: [
      {
        label: "Workflow Center",
        href: "/workflow",
        icon: (
          <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
            <path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2zm.5 3a.5.5 0 0 0 0 1h11a.5.5 0 0 0 0-1zm0 3a.5.5 0 0 0 0 1h11a.5.5 0 0 0 0-1zm0 3a.5.5 0 0 0 0 1h6a.5.5 0 0 0 0-1z" />
          </svg>
        ),
      },
      {
        label: "Playbooks",
        href: "/workflow/playbooks",
        icon: (
          <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
            <path d="M3.75 0h8.5C13.216 0 14 .784 14 1.75v12.5A1.75 1.75 0 0 1 12.25 16h-8.5A1.75 1.75 0 0 1 2 14.25V1.75C2 .784 2.784 0 3.75 0Zm0 1.5a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h8.5a.25.25 0 0 0 .25-.25V1.75a.25.25 0 0 0-.25-.25h-8.5ZM4.75 4h6.5a.75.75 0 0 1 0 1.5h-6.5a.75.75 0 0 1 0-1.5Zm0 3h6.5a.75.75 0 0 1 0 1.5h-6.5a.75.75 0 0 1 0-1.5Zm0 3h4a.75.75 0 0 1 0 1.5h-4a.75.75 0 0 1 0-1.5Z" />
          </svg>
        ),
      },
      {
        label: "Rules",
        href: "/workflow/rules",
        icon: (
          <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"/>
            <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.474l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115l.094-.319z"/>
          </svg>
        ),
      },
      {
        label: "Automation",
        href: "/workflow/automation",
        icon: (
          <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
            <path d="M6 12.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5ZM3 8.062C3 6.76 4.235 5.765 5.53 5.886a26.58 26.58 0 0 0 4.94 0C11.765 5.765 13 6.76 13 8.062v1.157a.933.933 0 0 1-.765.935c-.845.147-2.34.346-4.235.346-1.895 0-3.39-.2-4.235-.346A.933.933 0 0 1 3 9.219V8.062Zm4.542-.827a.25.25 0 0 0-.217.068l-.92.9a24.767 24.767 0 0 1-1.871-.183.25.25 0 0 0-.068.495c.55.076 1.232.149 2.02.193a.25.25 0 0 0 .189-.071l.754-.736.847 1.71a.25.25 0 0 0 .404.062l.932-.97a25.286 25.286 0 0 0 1.922-.188.25.25 0 0 0-.068-.495c-.538.074-1.207.145-1.98.189a.25.25 0 0 0-.166.076l-.754.785-.842-1.7a.25.25 0 0 0-.182-.134Z"/>
            <path d="M8 1C5.662 1 3.338 1.772 1.5 3.298L.275 2.071a.5.5 0 0 0-.764.651L1.035 4.24C-.007 5.608-.5 7.32-.5 9h1c0-1.54.443-3.03 1.284-4.24l.919.92A7.992 7.992 0 0 0 0 9h1a7 7 0 0 1 14 0h1a7.992 7.992 0 0 0-2.703-5.32l.919-.92C15.057 5.97 15.5 7.46 15.5 9h1c0-1.68-.493-3.392-1.535-4.76l1.524-1.518a.5.5 0 0 0-.764-.651L14.5 3.298C12.662 1.772 10.338 1 8 1z"/>
          </svg>
        ),
      },
      {
        label: "Case Flow",
        href: "/workflow/cases",
        icon: (
          <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
            <path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v13.5a.5.5 0 0 1-.777.416L8 13.101l-5.223 2.815A.5.5 0 0 1 2 15.5V2zm2-1a1 1 0 0 0-1 1v12.566l4.723-2.482a.5.5 0 0 1 .554 0L13 14.566V2a1 1 0 0 0-1-1H4z"/>
          </svg>
        ),
      },
      {
        label: "Executions",
        href: "/workflow/executions",
        icon: (
          <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
            <path d="M1.5 1.5A.5.5 0 0 1 2 1h12a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.128.334L10 8.692V13.5a.5.5 0 0 1-.342.474l-3 1A.5.5 0 0 1 6 14.5V8.692L1.628 3.834A.5.5 0 0 1 1.5 3.5v-2zm1 .5v1.308l4.372 4.858A.5.5 0 0 1 7 8.5v5.306l2-.666V8.5a.5.5 0 0 1 .128-.334L13.5 3.308V2h-11z"/>
          </svg>
        ),
      },
    ],
  },
  {
    title: "REPORTING",
    items: [
      {
        label: "Reports",
        href: "/reports",
        icon: (
          <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
            <path d="M3.75 0h8.5C13.216 0 14 .784 14 1.75v12.5A1.75 1.75 0 0 1 12.25 16h-8.5A1.75 1.75 0 0 1 2 14.25V1.75C2 .784 2.784 0 3.75 0Zm0 1.5a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h8.5a.25.25 0 0 0 .25-.25V1.75a.25.25 0 0 0-.25-.25h-8.5ZM4.75 4h6.5a.75.75 0 0 1 0 1.5h-6.5a.75.75 0 0 1 0-1.5Zm0 3h6.5a.75.75 0 0 1 0 1.5h-6.5a.75.75 0 0 1 0-1.5Zm0 3h4a.75.75 0 0 1 0 1.5h-4a.75.75 0 0 1 0-1.5Z" />
          </svg>
        ),
      },
    ],
  },
];

const settingsItem = {
  label: "Settings",
  href: "/settings",
  icon: (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 0a8.2 8.2 0 0 1 .701.031C9.444.095 9.99.645 10.16 1.29l.288 1.107c.018.066.079.158.212.224.231.114.454.243.668.386.123.082.233.09.299.071l1.103-.303c.644-.176 1.392.021 1.82.63.27.385.506.792.704 1.218.315.675.111 1.422-.364 1.891l-.814.806c-.049.048-.098.147-.088.294.016.257.016.515 0 .772-.01.147.038.246.088.294l.814.806c.475.469.679 1.216.364 1.891a7.977 7.977 0 0 1-.704 1.217c-.428.61-1.176.807-1.82.63l-1.102-.302c-.067-.019-.177-.011-.3.071a5.909 5.909 0 0 1-.668.386c-.133.066-.194.158-.211.224l-.29 1.106c-.168.646-.715 1.196-1.458 1.26a8.006 8.006 0 0 1-1.402 0c-.743-.064-1.289-.614-1.458-1.26l-.289-1.106c-.018-.066-.079-.158-.212-.224a5.738 5.738 0 0 1-.668-.386c-.123-.082-.233-.09-.299-.071l-1.103.303c-.644.176-1.392-.021-1.82-.63a8.12 8.12 0 0 1-.704-1.218c-.315-.675-.111-1.422.363-1.891l.815-.806c.05-.048.098-.147.088-.294a6.214 6.214 0 0 1 0-.772c.01-.147-.038-.246-.088-.294l-.815-.806C.635 6.045.431 5.298.746 4.623a7.92 7.92 0 0 1 .704-1.217c.428-.61 1.176-.807 1.82-.63l1.102.302c.067.019.177.011.3-.071.214-.143.437-.272.668-.386.133-.066.194-.158.211-.224l.29-1.106C6.009.645 6.556.095 7.299.03 7.53.01 7.764 0 8 0Zm-.571 1.525c-.036.003-.108.036-.137.146l-.289 1.105c-.147.561-.549.967-.998 1.189-.173.086-.34.183-.5.29-.417.278-.97.423-1.529.27l-1.103-.303c-.109-.03-.175.016-.195.045-.22.312-.412.644-.573.99-.014.031-.021.11.059.19l.815.806c.411.406.562.957.53 1.456a4.709 4.709 0 0 0 0 .582c.032.499-.119 1.05-.53 1.456l-.815.806c-.081.08-.073.159-.059.19.162.346.353.677.573.989.02.03.085.076.195.046l1.102-.303c.56-.153 1.113-.008 1.53.27.161.107.328.204.501.29.447.222.85.629.997 1.189l.289 1.105c.029.109.101.143.137.146a6.6 6.6 0 0 0 1.142 0c.036-.003.108-.036.137-.146l.289-1.105c.147-.561.549-.967.998-1.189.173-.086.34-.183.5-.29.417-.278.97-.423 1.529-.27l1.103.303c.109.029.175-.016.195-.045.22-.313.411-.644.573-.99.014-.031.021-.11-.059-.19l-.815-.806c-.411-.406-.562-.957-.53-1.456a4.709 4.709 0 0 0 0-.582c-.032-.499.119-1.05.53-1.456l.815-.806c.081-.08.073-.159.059-.19a6.464 6.464 0 0 0-.573-.989c-.02-.03-.085-.076-.195-.046l-1.102.303c-.56.153-1.113.008-1.53-.27a4.44 4.44 0 0 0-.501-.29c-.447-.222-.85-.629-.997-1.189l-.289-1.105c-.029-.11-.101-.143-.137-.146a6.6 6.6 0 0 0-1.142 0ZM8 5.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM8 7a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z" />
    </svg>
  ),
};

export default function ProjectSidebar({ projectId }: Props) {
  const pathname = usePathname();
  const base = `/dashboard/projects/${projectId}`;
  const [mobileOpen, setMobileOpen] = useState(false);

  function isActive(href: string) {
    const full = `${base}${href}`;
    if (href === "") return pathname === base;
    return pathname.startsWith(full);
  }

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile hamburger button — shown when sidebar is closed */}
      <button
        className="fixed top-[104px] left-3 z-50 lg:hidden w-8 h-8 flex items-center justify-center bg-surface border border-border rounded-lg text-muted hover:text-foreground transition-colors"
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation"
        style={{ display: mobileOpen ? "none" : undefined }}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path d="M1 2.75A.75.75 0 0 1 1.75 2h12.5a.75.75 0 0 1 0 1.5H1.75A.75.75 0 0 1 1 2.75Zm0 5A.75.75 0 0 1 1.75 7h12.5a.75.75 0 0 1 0 1.5H1.75A.75.75 0 0 1 1 7.75Zm0 5a.75.75 0 0 1 .75-.75h12.5a.75.75 0 0 1 0 1.5H1.75a.75.75 0 0 1-.75-.75Z" />
        </svg>
      </button>

      {/* Sidebar */}
      <aside
        className={`
          w-52 shrink-0 bg-surface border-r border-border flex flex-col h-full
          fixed inset-y-0 left-0 z-50 transition-transform duration-300
          lg:relative lg:translate-x-0 lg:z-auto
          ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Mobile close button inside sidebar */}
        <button
          className="lg:hidden absolute top-3 right-3 text-muted hover:text-foreground transition-colors p-1 rounded"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
          </svg>
        </button>

        <nav className="flex-1 py-4 px-2 space-y-2.5 overflow-y-auto">
          {navSections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              {idx > 0 && <div className="h-px bg-border/60 my-3 mx-2" />}
              {section.title && (
                <div className="px-3 pt-1 pb-1 text-[10px] font-bold text-muted/40 uppercase tracking-widest">
                  {section.title}
                </div>
              )}
              {section.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.label}
                    href={`${base}${item.href}`}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all relative group ${
                      active
                        ? "bg-surface-2/60 text-accent"
                        : "text-muted hover:text-foreground hover:bg-surface-hover"
                    }`}
                  >
                    {active && <span className="absolute left-0 top-2 bottom-2 w-0.5 bg-accent rounded-r" />}
                    <span className={`shrink-0 transition-colors ${active ? "text-accent" : "text-muted group-hover:text-foreground"}`}>
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="px-2 pb-4 border-t border-border pt-3">
          {(() => {
            const active = isActive(settingsItem.href);
            return (
              <Link
                href={`${base}${settingsItem.href}`}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  active
                    ? "bg-accent/10 text-accent font-medium"
                    : "text-muted hover:text-foreground hover:bg-surface-2"
                }`}
              >
                <span className={active ? "text-accent" : "text-muted"}>{settingsItem.icon}</span>
                {settingsItem.label}
              </Link>
            );
          })()}
        </div>
      </aside>
    </>
  );
}
