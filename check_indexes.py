import sqlite3

conn = sqlite3.connect("test.db")
rows = conn.execute("PRAGMA index_list('leads')").fetchall()
print(rows)
