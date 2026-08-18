SELECT 'course' AS metric, COUNT(*) AS value
FROM courses WHERE slug = 'forward-deployed-engineering';

SELECT 'chapters' AS metric, COUNT(*) AS value
FROM chapters WHERE course_id = 'course_forward_deployed_engineering';

SELECT 'sources' AS metric, COUNT(*) AS value
FROM course_knowledge_sources WHERE course_slug = 'forward-deployed-engineering';

SELECT 'fde_skills' AS metric, COUNT(*) AS value
FROM skills WHERE id LIKE 'skill_fde_%';

SELECT 'fde_coverage' AS metric, COUNT(*) AS value
FROM lesson_skill_coverage
WHERE course_id = 'forward-deployed-engineering' AND review_status = 'approved';

SELECT 'fde_jobs' AS metric, COUNT(*) AS value
FROM job_postings
WHERE status = 'published'
  AND (title LIKE 'Forward Deployed Engineer%' OR title LIKE '%FDE%');

SELECT 'fde_jobs_with_approved_evidence' AS metric, COUNT(DISTINCT job_skill_evidence.job_id) AS value
FROM job_skill_evidence
JOIN job_postings ON job_postings.id = job_skill_evidence.job_id
WHERE job_postings.status = 'published'
  AND (job_postings.title LIKE 'Forward Deployed Engineer%' OR job_postings.title LIKE '%FDE%')
  AND job_skill_evidence.review_status = 'approved';

SELECT 'fde_jobs_with_course_links' AS metric, COUNT(DISTINCT job_skill_evidence.job_id) AS value
FROM job_skill_evidence
JOIN job_postings ON job_postings.id = job_skill_evidence.job_id
JOIN lesson_skill_coverage
  ON lesson_skill_coverage.skill_id = job_skill_evidence.skill_id
 AND lesson_skill_coverage.course_id = 'forward-deployed-engineering'
 AND lesson_skill_coverage.review_status = 'approved'
WHERE job_postings.status = 'published'
  AND (job_postings.title LIKE 'Forward Deployed Engineer%' OR job_postings.title LIKE '%FDE%')
  AND job_skill_evidence.review_status = 'approved';

SELECT skills.slug,
       COUNT(DISTINCT job_skill_evidence.job_id) AS jobs,
       COUNT(DISTINCT lesson_skill_coverage.lesson_route_id) AS linked_lessons
FROM skills
JOIN job_skill_evidence ON job_skill_evidence.skill_id = skills.id
JOIN job_postings ON job_postings.id = job_skill_evidence.job_id
JOIN lesson_skill_coverage
  ON lesson_skill_coverage.skill_id = skills.id
 AND lesson_skill_coverage.course_id = 'forward-deployed-engineering'
WHERE job_postings.status = 'published'
  AND (job_postings.title LIKE 'Forward Deployed Engineer%' OR job_postings.title LIKE '%FDE%')
  AND job_skill_evidence.review_status = 'approved'
  AND lesson_skill_coverage.review_status = 'approved'
GROUP BY skills.slug
ORDER BY jobs DESC, skills.slug;
