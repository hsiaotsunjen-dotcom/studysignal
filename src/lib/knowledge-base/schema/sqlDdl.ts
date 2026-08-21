/**
 * Optional SQL DDL sketch for a future relational migration.
 * Not executed by the app — documents the intended tables/FKs.
 *
 * StudySignal currently has no ORM; this file is the migration blueprint.
 */

export const KNOWLEDGE_BASE_SQL_DDL = `
-- StudySignal Knowledge Base (skeleton DDL)
-- Provider-agnostic; adjust types for Postgres / SQLite as needed.

CREATE TABLE subject (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE education_level (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL
);

CREATE TABLE curriculum (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL REFERENCES subject(id),
  education_level_id TEXT NOT NULL REFERENCES education_level(id),
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  source TEXT NOT NULL,
  scope_description TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE curriculum_unit (
  id TEXT PRIMARY KEY,
  curriculum_id TEXT NOT NULL REFERENCES curriculum(id),
  parent_id TEXT REFERENCES curriculum_unit(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  level INTEGER NOT NULL
);

CREATE TABLE knowledge_node (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL REFERENCES subject(id),
  curriculum_unit_id TEXT NOT NULL REFERENCES curriculum_unit(id),
  parent_id TEXT REFERENCES knowledge_node(id),
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  knowledge_type TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  scope_status TEXT NOT NULL,
  "order" INTEGER NOT NULL
);

CREATE TABLE knowledge_relation (
  id TEXT PRIMARY KEY,
  source_node_id TEXT NOT NULL REFERENCES knowledge_node(id),
  target_node_id TEXT NOT NULL REFERENCES knowledge_node(id),
  relation_type TEXT NOT NULL,
  weight REAL NOT NULL DEFAULT 1,
  CHECK (source_node_id <> target_node_id)
);

CREATE TABLE exam_source (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL REFERENCES subject(id),
  education_level_id TEXT NOT NULL REFERENCES education_level(id),
  year INTEGER NOT NULL,
  exam_name TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_file TEXT,
  source_url TEXT
);

CREATE TABLE exam_question (
  id TEXT PRIMARY KEY,
  exam_source_id TEXT NOT NULL REFERENCES exam_source(id),
  question_number TEXT NOT NULL,
  question_type TEXT NOT NULL,
  question_text TEXT NOT NULL,
  answer TEXT NOT NULL,
  explanation TEXT NOT NULL,
  difficulty TEXT NOT NULL
);

CREATE TABLE question_knowledge (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES exam_question(id),
  knowledge_node_id TEXT NOT NULL REFERENCES knowledge_node(id),
  relevance REAL NOT NULL,
  role TEXT NOT NULL
);

CREATE TABLE learning_objective (
  id TEXT PRIMARY KEY,
  knowledge_node_id TEXT NOT NULL REFERENCES knowledge_node(id),
  objective TEXT NOT NULL,
  measurable_criteria TEXT NOT NULL
);

CREATE TABLE learning_resource (
  id TEXT PRIMARY KEY,
  knowledge_node_id TEXT NOT NULL REFERENCES knowledge_node(id),
  resource_type TEXT NOT NULL,
  title TEXT NOT NULL,
  source TEXT NOT NULL,
  url TEXT,
  description TEXT NOT NULL
);
`.trim();
