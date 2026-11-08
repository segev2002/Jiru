-- Jiru (ChatGPT-style chat) — MySQL schema.
-- Every conversation has a unique id; every message belongs to one
-- conversation and says who wrote it (user or assistant).

CREATE DATABASE IF NOT EXISTS chatgpt_clone
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE chatgpt_clone;

CREATE TABLE IF NOT EXISTS conversations (
  id         CHAR(36)     NOT NULL,              -- UUID, e.g. 3f2b8c1e-...
  title      VARCHAR(255) NOT NULL DEFAULT 'New chat',
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS messages (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  conversation_id CHAR(36)     NOT NULL,
  role            ENUM('user', 'assistant') NOT NULL,  -- who said it
  content         TEXT         NOT NULL,
  reasoning       TEXT         NULL,                 -- the assistant's visible thinking, if any
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_messages_conversation (conversation_id, id),
  CONSTRAINT fk_messages_conversation
    FOREIGN KEY (conversation_id) REFERENCES conversations (id)
    ON DELETE CASCADE
) ENGINE=InnoDB;
