const anpData = {
  sisoIncidentes: {
    description: "dados.gov.br/organization/anp — 30,054 records (2013–2026), published under Lei nº 12.527/2011",
    url: "https://dados.gov.br/dados/conjuntos-dados/dados-de-incidentes-de-exploracao-e-producao-de-petroleo-e-gas-natural"
  },
  resolucao46: {
    description: "gov.br/anp — Well Integrity Management System; mandatory for all E&P licensees",
    url: "https://www.gov.br/anp/pt-br/assuntos/exploracao-e-producao-de-oleo-e-gas/seguranca-operacional/sistema-de-gerenciamento-da-integridade-de-pocos-sgip"
  },
  resolucao43: {
    description: "gov.br/anp — Operational Safety Management System for drilling and production",
    url: "https://www.gov.br/anp/pt-br/assuntos/exploracao-e-producao-de-oleo-e-gas/seguranca-operacional/sistema-de-gerenciamento-da-seguranca-operacional-sgso"
  },
  resolucao41: {
    description: "gov.br/anp — Subsea systems safety management",
    url: "https://www.gov.br/anp/pt-br/assuntos/exploracao-e-producao-de-oleo-e-gas/seguranca-operacional/sistemas-submarinos"
  }
};

const bureauVeritasData = {
  nr445: {
    description: "marine-offshore.bureauveritas.com/nr445 — Free download; governs structural, machinery, and safety systems on all BV-classed units",
    url: "https://marine-offshore.bureauveritas.com/nr445-rules-classification-offshore-units"
  },
  nr459: {
    description: "marine-offshore.bureauveritas.com — Applies to completion and well control process systems",
    url: "https://marine-offshore.bureauveritas.com/nr459-process-systems-onboard-offshore-units-and-installations"
  },
  nr493: {
    description: "marine-offshore.bureauveritas.com — Applicable to floating units",
    url: "https://marine-offshore.bureauveritas.com/rules-guidelines"
  },
  ivbsBra: {
    description: "marine-offshore.bureauveritas.com — Brazil-specific independent verification bridging ANP, DPC, NR-37, and IBAMA requirements",
    url: "https://marine-offshore.bureauveritas.com/"
  }
};

const mteDpcData = {
  nr37: {
    description: "trabalho.gov.br — Health and safety standard for all personnel on offshore platforms",
    url: "https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/arquivos/normas-regulamentadoras/nr-37-atualizada-2022.pdf"
  },
  nr33_35: {
    description: "trabalho.gov.br — Confined space and work-at-height",
    url: "https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/arquivos/normas-regulamentadoras/nr-33-atualizada-2022.pdf"
  },
  normam01: {
    description: "marinha.mil.br/dpc — Maritime Authority safety regulations for vessels and crew",
    url: "https://www.marinha.mil.br/dpc/normam"
  }
};

const internationalRefs = {
  bsee: {
    description: "bsee.gov/stats-facts/offshore-incident-statistics — Global precedent for analogous failure modes",
    url: "https://www.bsee.gov/stats-facts/offshore-incident-statistics"
  },
  hseUk: {
    description: "hse.gov.uk/offshore/hydrocarbon-releases — International benchmark for leak and well control events",
    url: "https://www.hse.gov.uk/offshore/hydrocarbon-releases.htm"
  }
};

module.exports = {
  anpData,
  bureauVeritasData,
  mteDpcData,
  internationalRefs
};
