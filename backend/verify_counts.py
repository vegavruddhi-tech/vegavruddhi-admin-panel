from pymongo import MongoClient
import certifi
from datetime import datetime

MONGO_URI = 'mongodb+srv://dataanalyst_db_user:Mm7zy0KE8T1GLImq@cluster0.qtvqyxk.mongodb.net/CompanyDB?retryWrites=true&w=majority&appName=Cluster0'
client = MongoClient(MONGO_URI, tlsCAFile=certifi.where())
db = client['CompanyDB']
col = db['Forms_respones']

start = datetime(2026, 4, 1)
end   = datetime(2026, 4, 30, 23, 59, 59)

total_meetings = col.count_documents({'createdAt': {'$gte': start, '$lte': end}})
total_sales    = col.count_documents({'createdAt': {'$gte': start, '$lte': end}, 'status': 'Ready for Onboarding'})
distinct_fses  = len(col.distinct('employeeName', {'createdAt': {'$gte': start, '$lte': end}}))

print(f'Total Meetings (April 2026): {total_meetings}')
print(f'Total Product Sales (Ready for Onboarding): {total_sales}')
print(f'Total Distinct FSEs: {distinct_fses}')
client.close()
