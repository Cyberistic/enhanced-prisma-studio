DELETE FROM comments;
DELETE FROM todos;
DELETE FROM users;

INSERT INTO users (id, email, name, createdAt) VALUES
  ('u1', 'alice@example.com', 'Alice', '2026-03-01T00:00:00.000Z'),
  ('u2', 'bob@example.com', 'Bob', '2026-03-02T00:00:00.000Z');

INSERT INTO todos (id, userId, title, completed, priority, createdAt) VALUES
  ('t1', 'u1', 'Ship studio', 0, 'high', '2026-03-10T12:00:00.000Z'),
  ('t2', 'u1', 'Write docs', 1, 'medium', '2026-03-11T12:00:00.000Z'),
  ('t3', 'u2', 'Fix bug', 0, 'urgent', '2026-03-12T12:00:00.000Z');

INSERT INTO comments (id, todoId, body, createdAt) VALUES
  ('c1', 't1', 'Need review', '2026-03-13T12:00:00.000Z'),
  ('c2', 't1', 'Looks good', '2026-03-14T12:00:00.000Z');
