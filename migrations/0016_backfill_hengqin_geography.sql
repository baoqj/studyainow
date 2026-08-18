-- Hengqin is a mainland-China cooperation zone administered by Zhuhai,
-- Guangdong. Repair the one first-sync location recorded before that canonical
-- place mapping was introduced.
UPDATE job_locations
SET country_code = 'CN',
    country_name = 'China',
    region_name = '广东省',
    city_name = '珠海市',
    confidence = 1,
    source_method = 'admin_review'
WHERE raw_location_text = '横琴粤澳深度合作区'
  AND country_code IS NULL;
