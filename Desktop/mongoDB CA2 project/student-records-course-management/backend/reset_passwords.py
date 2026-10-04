import bcrypt
from pymongo import MongoClient

client = MongoClient('mongodb://localhost:27017/')
db = client['studentDB']

new_hash = bcrypt.hashpw(b'admin123', bcrypt.gensalt()).decode('utf-8')
result = db.users.update_one({'username': 'admin'}, {'$set': {'password': new_hash}})
print(f'Matched: {result.matched_count}, Modified: {result.modified_count}')
print(f'New hash prefix: {new_hash[:20]}...')

# Verify it works
u = db.users.find_one({'username': 'admin'})
ok = bcrypt.checkpw(b'admin123', u['password'].encode('utf-8'))
print(f'Password verify test: {ok}')

# Also reset teacher1 password to admin123 for convenience
new_hash2 = bcrypt.hashpw(b'teacher123', bcrypt.gensalt()).decode('utf-8')
db.users.update_one({'username': 'teacher1'}, {'$set': {'password': new_hash2}})
print('teacher1 password set to: teacher123')
print('DONE - Admin login: admin / admin123')
