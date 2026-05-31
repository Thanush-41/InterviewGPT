from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import IndexModel, ASCENDING
from app.config import get_settings

settings = get_settings()

client: AsyncIOMotorClient = None
db = None


async def connect_db():
    global client, db
    client = AsyncIOMotorClient(settings.mongodb_uri)
    db = client[settings.mongodb_db]

    # Create indexes
    await db.candidates.create_indexes([
        IndexModel([("email", ASCENDING)], unique=True, sparse=True),
        IndexModel([("created_at", ASCENDING)]),
    ])
    await db.interviews.create_indexes([
        IndexModel([("candidate_id", ASCENDING)]),
        IndexModel([("status", ASCENDING)]),
    ])

    # Create vector search index (Atlas only — locally this is a no-op)
    # For local MongoDB, we use a regular index on embeddings field
    try:
        await db.command({
            "createSearchIndex": "candidate_embeddings",
            "definition": {
                "mappings": {
                    "dynamic": False,
                    "fields": {
                        "embedding": {
                            "type": "knnVector",
                            "dimensions": 768,
                            "similarity": "cosine"
                        },
                        "candidate_id": {"type": "objectId"},
                        "chunk_type": {"type": "string"},
                        "text": {"type": "string"}
                    }
                }
            }
        })
    except Exception:
        # Vector search index might already exist or not be supported locally
        pass


async def close_db():
    global client
    if client:
        client.close()


def get_db():
    return db
