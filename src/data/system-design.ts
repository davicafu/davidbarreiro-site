/** @typedef {'en' | 'es'} SystemDesignLocale */

const FLOW_COPY = {
  en: {
    domainSources: {
      name: 'Domain Sources',
      detail: 'Applications, APIs, databases, and external producers publishing business events.',
      impact: 'Clear ownership boundaries with contract-driven data exchange between domains.',
      tech: ['Apps', 'APIs', 'DBs', 'CDC', 'Event Producers']
    },
    ingestionLayer: {
      name: 'Ingestion Layer',
      detail: 'Reliable intake layer for batch, streaming, API, and CDC-based data flows.',
      impact: 'Backpressure-aware ingestion with retries, idempotency, and replayable delivery patterns.',
      tech: {
        kafka: 'Kafka',
        queue: 'Message Queues',
        connect: 'Kafka Connect',
        connectors: 'Connectors',
        transport: 'REST / gRPC',
        cdc: 'CDC'
      }
    },
    eventBackbone: {
      name: 'Event Backbone',
      detail: 'Central event-driven layer for distributing facts across systems in real time.',
      impact: 'Decoupled services, schema governance, replayability, and independent consumer scaling.',
      tech: ['Kafka Topics', 'Schema Registry', 'Event Contracts']
    },
    processing: {
      name: 'Processing & Orchestration',
      detail: 'Streaming and asynchronous processing for enrichment, validation, and aggregation.',
      impact: 'Deterministic pipelines designed for low latency, fault tolerance, and testability.',
      tech: {
        workers: 'Go Workers',
        flink: 'Flink',
        streaming: 'Streaming Engines',
        spark: 'Spark',
        batch: 'Batch / Distributed Processing',
        stateful: 'Stateful Processing'
      }
    },
    storage: {
      name: 'Storage & Serving',
      detail: 'Operational, analytical, and search-optimized storage models.',
      impact: 'Purpose-built serving layers for APIs, dashboards, analytics, and high-concurrency reads.',
      tech: {
        postgres: 'PostgreSQL',
        relational: 'Relational DB',
        clickhouse: 'ClickHouse',
        analytics: 'Analytics DB',
        search: 'Elasticsearch',
        apis: 'Data APIs'
      }
    },
    observability: {
      name: 'Observability & Governance',
      detail: 'Monitoring, data quality, lineage, alerts, and platform health signals.',
      impact:
        'Observable-by-default platform with measurable reliability, traceability, and faster incident response.',
      tech: ['Grafana', 'Metrics', 'Logs', 'Alerts', 'Data Quality']
    },
    consumers: {
      name: 'Consumers',
      detail: 'Internal products, APIs, dashboards, alerts, and downstream business systems.',
      impact: 'Reusable data products exposed through stable contracts instead of ad-hoc integrations.',
      tech: ['Dashboards', 'Customer APIs', 'Internal Tools', 'Data Products']
    }
  },
  es: {
    domainSources: {
      name: 'Fuentes de Dominio',
      detail: 'Aplicaciones, APIs, bases de datos y productores externos publicando eventos de negocio.',
      impact: 'Límites claros de propiedad con intercambio de datos guiado por contratos entre dominios.',
      tech: ['Apps', 'APIs', 'BBDD', 'CDC', 'Productores de Eventos']
    },
    ingestionLayer: {
      name: 'Capa de Ingesta',
      detail: 'Capa de entrada fiable para flujos batch, streaming, API y CDC.',
      impact: 'Ingesta con control de backpressure, reintentos, idempotencia y patrones de replay.',
      tech: {
        kafka: 'Kafka',
        queue: 'Colas de Mensajes',
        connect: 'Kafka Connect',
        connectors: 'Conectores',
        transport: 'REST / gRPC',
        cdc: 'CDC'
      }
    },
    eventBackbone: {
      name: 'Capa principal de Eventos',
      detail: 'Capa central guiada por eventos para distribuir hechos entre sistemas en tiempo real.',
      impact:
        'Servicios desacoplados, gobierno de esquemas, replayabilidad y escalado independiente de consumidores.',
      tech: ['Topics Kafka', 'Schema Registry', 'Contratos de Eventos']
    },
    processing: {
      name: 'Procesamiento y Orquestación',
      detail: 'Procesamiento streaming y asíncrono para enriquecimiento, validación y agregación.',
      impact: 'Pipelines deterministas diseñados para baja latencia, tolerancia a fallos y testabilidad.',
      tech: {
        workers: 'Funciones en Go',
        flink: 'Flink',
        streaming: 'Motores de Streaming',
        spark: 'Spark',
        batch: 'Procesamiento Batch / Distribuido',
        stateful: 'Procesamiento con Estado'
      }
    },
    storage: {
      name: 'Almacenamiento y Servcio',
      detail: 'Modelos de almacenamiento operacionales, analíticos y orientados a búsqueda.',
      impact:
        'Capas de servicio pensadas para APIs, dashboards, analítica y lecturas concurrentes de alto volumen.',
      tech: {
        postgres: 'PostgreSQL',
        relational: 'BBDD Relacional',
        clickhouse: 'ClickHouse',
        analytics: 'BBDD Analítica',
        search: 'Elasticsearch',
        apis: 'APIs de Datos'
      }
    },
    observability: {
      name: 'Observabilidad y Gobierno',
      detail: 'Monitorización, calidad de datos, linaje, alertas y señales de salud de plataforma.',
      impact:
        'Plataforma observable por defecto, con fiabilidad medible, trazabilidad y respuesta más rápida a incidencias.',
      tech: ['Grafana', 'Métricas', 'Logs', 'Alertas', 'Calidad de Datos']
    },
    consumers: {
      name: 'Consumidores',
      detail:
        'Productos internos, APIs, dashboards, alertas y y flujo de información en sistemas de negocio.',
      impact:
        'Productos de datos reutilizables expuestos mediante contratos estables en lugar de integraciones ad hoc.',
      tech: ['Dashboards', 'APIs de Cliente', 'Herramientas Internas', 'Productos de Datos']
    }
  }
};

/**
 * @param {Array<{ keywords?: Array<string | { name?: string }> }>} skills
 * @param {SystemDesignLocale} [locale='en']
 */
export function deriveSystemDesignFlow(skills, locale = 'en') {
  const copy = FLOW_COPY[locale] || FLOW_COPY.en;
  const allKeywords = skills.flatMap((group) => group.keywords || []);
  const has = (term) =>
    allKeywords.some((keyword) => {
      const name = typeof keyword === 'string' ? keyword : keyword?.name || '';
      return name.toLowerCase().includes(term.toLowerCase());
    });

  return [
    {
      name: copy.domainSources.name,
      detail: copy.domainSources.detail,
      impact: copy.domainSources.impact,
      tech: copy.domainSources.tech
    },
    {
      name: copy.ingestionLayer.name,
      detail: copy.ingestionLayer.detail,
      impact: copy.ingestionLayer.impact,
      tech: [
        has('kafka') ? copy.ingestionLayer.tech.kafka : copy.ingestionLayer.tech.queue,
        has('connect') ? copy.ingestionLayer.tech.connect : copy.ingestionLayer.tech.connectors,
        copy.ingestionLayer.tech.transport,
        copy.ingestionLayer.tech.cdc
      ]
    },
    {
      name: copy.eventBackbone.name,
      detail: copy.eventBackbone.detail,
      impact: copy.eventBackbone.impact,
      tech: copy.eventBackbone.tech
    },
    {
      name: copy.processing.name,
      detail: copy.processing.detail,
      impact: copy.processing.impact,
      tech: [
        copy.processing.tech.workers,
        has('flink') ? copy.processing.tech.flink : copy.processing.tech.streaming,
        has('spark') ? copy.processing.tech.spark : copy.processing.tech.batch,
        copy.processing.tech.stateful
      ]
    },
    {
      name: copy.storage.name,
      detail: copy.storage.detail,
      impact: copy.storage.impact,
      tech: [
        has('postgres') ? copy.storage.tech.postgres : copy.storage.tech.relational,
        has('clickhouse') ? copy.storage.tech.clickhouse : copy.storage.tech.analytics,
        copy.storage.tech.search,
        copy.storage.tech.apis
      ]
    },
    {
      name: copy.observability.name,
      detail: copy.observability.detail,
      impact: copy.observability.impact,
      tech: copy.observability.tech
    },
    {
      name: copy.consumers.name,
      detail: copy.consumers.detail,
      impact: copy.consumers.impact,
      tech: copy.consumers.tech
    }
  ];
}
