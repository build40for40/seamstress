UPDATE activity
SET detail = json_set(detail, '$.alias', 'seamless-' || substr(json_extract(detail, '$.alias'), length('seamstress-') + 1))
WHERE kind = 'email' AND json_extract(detail, '$.alias') LIKE 'seamstress-%';
