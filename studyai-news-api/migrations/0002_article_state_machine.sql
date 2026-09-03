PRAGMA foreign_keys = ON;

CREATE TABLE article_status_transition (
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  requires_human_approval INTEGER NOT NULL DEFAULT 0 CHECK (requires_human_approval IN (0, 1)),
  description TEXT NOT NULL,
  PRIMARY KEY (from_status, to_status),
  CHECK (from_status <> to_status)
) STRICT;

INSERT INTO article_status_transition
  (from_status, to_status, requires_human_approval, description)
VALUES
  ('draft', 'in_review', 0, 'Submit an immutable revision for editorial review'),
  ('in_review', 'draft', 0, 'Return the article for revision'),
  ('in_review', 'scheduled', 1, 'Approve and schedule the active revision'),
  ('in_review', 'published', 1, 'Approve and publish the active revision immediately'),
  ('in_review', 'rejected', 0, 'Reject the active revision'),
  ('rejected', 'draft', 0, 'Reopen a rejected article as a new draft'),
  ('scheduled', 'draft', 0, 'Cancel the schedule and return to draft'),
  ('scheduled', 'in_review', 0, 'Return a scheduled article to review'),
  ('scheduled', 'published', 1, 'Publish the approved scheduled revision'),
  ('published', 'corrected', 1, 'Publish an approved corrective revision'),
  ('published', 'distributed', 1, 'Record completion of distribution for the published revision'),
  ('published', 'withdrawn', 1, 'Withdraw published content with human authorization'),
  ('corrected', 'published', 1, 'Return corrected content to the published state'),
  ('corrected', 'distributed', 1, 'Distribute the approved corrective revision'),
  ('corrected', 'withdrawn', 1, 'Withdraw corrected content with human authorization'),
  ('distributed', 'corrected', 1, 'Publish an approved correction after distribution'),
  ('distributed', 'withdrawn', 1, 'Withdraw distributed content with human authorization');

CREATE TRIGGER article_initial_status_guard
BEFORE INSERT ON article
WHEN NEW.status <> 'draft'
BEGIN
  SELECT RAISE(ABORT, 'article must start in draft');
END;

CREATE TRIGGER article_revision_reference_guard
BEFORE UPDATE OF active_revision_id, published_revision_id ON article
WHEN
  (NEW.active_revision_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM article_revision
    WHERE id = NEW.active_revision_id AND article_id = NEW.id
  ))
  OR
  (NEW.published_revision_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM article_revision
    WHERE id = NEW.published_revision_id AND article_id = NEW.id
  ))
BEGIN
  SELECT RAISE(ABORT, 'article revision belongs to another article');
END;

CREATE TRIGGER article_status_transition_guard
BEFORE UPDATE OF status ON article
WHEN OLD.status <> NEW.status
  AND NOT EXISTS (
    SELECT 1
    FROM article_status_transition
    WHERE from_status = OLD.status AND to_status = NEW.status
  )
BEGIN
  SELECT RAISE(ABORT, 'invalid article status transition');
END;

CREATE TRIGGER article_active_revision_guard
BEFORE UPDATE OF status ON article
WHEN OLD.status <> NEW.status
  AND EXISTS (
    SELECT 1
    FROM article_status_transition
    WHERE from_status = OLD.status
      AND to_status = NEW.status
      AND requires_human_approval = 1
  )
  AND NEW.active_revision_id IS NULL
BEGIN
  SELECT RAISE(ABORT, 'active revision required');
END;

CREATE TRIGGER article_publisher_approval_guard
BEFORE UPDATE OF status ON article
WHEN OLD.status <> NEW.status
  AND EXISTS (
    SELECT 1
    FROM article_status_transition
    WHERE from_status = OLD.status
      AND to_status = NEW.status
      AND requires_human_approval = 1
  )
  AND NOT EXISTS (
    SELECT 1
    FROM article_revision AS revision
    JOIN article_approval AS approval ON approval.revision_id = revision.id
    WHERE revision.id = NEW.active_revision_id
      AND revision.article_id = NEW.id
      AND approval.decision = 'approved'
      AND approval.actor_role IN ('publisher', 'admin')
  )
BEGIN
  SELECT RAISE(ABORT, 'publisher approval required');
END;

CREATE TRIGGER article_published_revision_guard
BEFORE UPDATE OF status ON article
WHEN OLD.status <> NEW.status
  AND NEW.status IN ('published', 'corrected', 'distributed')
  AND EXISTS (
    SELECT 1
    FROM article_status_transition
    WHERE from_status = OLD.status AND to_status = NEW.status
  )
  AND (
    NEW.published_revision_id IS NULL
    OR NEW.published_revision_id <> NEW.active_revision_id
  )
BEGIN
  SELECT RAISE(ABORT, 'published revision must match active revision');
END;

CREATE TRIGGER article_revision_immutable_update
BEFORE UPDATE ON article_revision
BEGIN
  SELECT RAISE(ABORT, 'article revisions are immutable');
END;

CREATE TRIGGER article_revision_immutable_delete
BEFORE DELETE ON article_revision
BEGIN
  SELECT RAISE(ABORT, 'article revisions are immutable');
END;

CREATE TRIGGER article_approval_immutable_update
BEFORE UPDATE ON article_approval
BEGIN
  SELECT RAISE(ABORT, 'article approvals are immutable');
END;

CREATE TRIGGER article_approval_immutable_delete
BEFORE DELETE ON article_approval
BEGIN
  SELECT RAISE(ABORT, 'article approvals are immutable');
END;

CREATE TRIGGER source_snapshot_immutable_update
BEFORE UPDATE ON source_snapshot
BEGIN
  SELECT RAISE(ABORT, 'source snapshots are immutable');
END;

CREATE TRIGGER source_snapshot_immutable_delete
BEFORE DELETE ON source_snapshot
BEGIN
  SELECT RAISE(ABORT, 'source snapshots are immutable');
END;

CREATE TRIGGER audit_log_immutable_update
BEFORE UPDATE ON audit_log
BEGIN
  SELECT RAISE(ABORT, 'audit logs are immutable');
END;

CREATE TRIGGER audit_log_immutable_delete
BEFORE DELETE ON audit_log
BEGIN
  SELECT RAISE(ABORT, 'audit logs are immutable');
END;

CREATE TRIGGER publication_event_immutable_update
BEFORE UPDATE ON article_publication_event
BEGIN
  SELECT RAISE(ABORT, 'publication events are immutable');
END;

CREATE TRIGGER publication_event_immutable_delete
BEFORE DELETE ON article_publication_event
BEGIN
  SELECT RAISE(ABORT, 'publication events are immutable');
END;

UPDATE schema_metadata
SET value = '2', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE key = 'news_schema_version';
