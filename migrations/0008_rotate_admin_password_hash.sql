UPDATE auth_users
SET password_hash = 'pbkdf2_sha256$100000$wOBqhnzWim-Ym1JaHOyEfQ$t2jGPBXeT74csRHK3_zdKK1ivzvjSNz9wqDGpZfFPSA',
    updated_at = '2026-04-15T23:59:30.000Z'
WHERE username = 'ionadminmirnes'
  AND email = 'ionadminmirnes@ionirix.local';