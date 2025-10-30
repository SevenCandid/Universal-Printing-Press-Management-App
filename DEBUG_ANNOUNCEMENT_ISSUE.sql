-- Check what triggers exist on forum_posts
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'forum_posts';

-- Check the actual function definition
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines
WHERE routine_name LIKE '%forum%'
AND routine_type = 'FUNCTION';

-- Check if there are multiple versions of the notification function
SELECT 
    proname as function_name,
    pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE proname LIKE '%forum%';




