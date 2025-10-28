from sqlalchemy import create_engine, Table, Column, Integer, String, Text, MetaData
from sqlalchemy.dialects.postgresql import insert

class JobScraperPipeline:
    def __init__(self, db_url):
        self.db_url = db_url
        self.engine = None
        self.metadata = MetaData()
        self.jobs = None

    @classmethod
    def from_crawler(cls, crawler):
        db_url = crawler.settings.get('DATABASE_URL')
        return cls(db_url)

    def open_spider(self, spider):
        # Add connect_args to handle potential encoding issues on Windows
        self.engine = create_engine(self.db_url, connect_args={"client_encoding": "utf8"})
        self.metadata.bind = self.engine
        self.jobs = Table('jobs', self.metadata,
            Column('id', Integer, primary_key=True, autoincrement=True),
            Column('url', String(255), unique=True),
            Column('title', String(255)),
            Column('company', String(255)),
            Column('location', String(255)),
            Column('description', Text))
        self.metadata.create_all(self.engine)

    def close_spider(self, spider):
        self.engine.dispose()

    def process_item(self, item, spider):
        with self.engine.connect() as connection:
            # Use PostgreSQL's ON CONFLICT DO NOTHING to prevent duplicate entries
            upsert_statement = insert(self.jobs).values(
                url=item['url'],
                title=item['title'],
                company=item['company'],
                location=item['location'],
                description=str(item['description']) # Ensure description is a string
            ).on_conflict_do_nothing(index_elements=['url'])
            connection.execute(upsert_statement)
            connection.commit()
        return item