import asyncio
import json
from datetime import datetime, timezone
from typing import AsyncGenerator, Dict, List, Optional, Set

class EventBroadcaster:
    def __init__(self):
        self._subscribers: Dict[str, Set[asyncio.Queue]] = {}
        self._global_subscribers: Set[asyncio.Queue] = set()

    async def subscribe(self, migration_id: Optional[str] = None) -> asyncio.Queue:
        queue = asyncio.Queue(maxsize=100)
        if migration_id:
            if migration_id not in self._subscribers:
                self._subscribers[migration_id] = set()
            self._subscribers[migration_id].add(queue)
        else:
            self._global_subscribers.add(queue)
        return queue

    async def unsubscribe(self, queue: asyncio.Queue, migration_id: Optional[str] = None):
        if migration_id and migration_id in self._subscribers:
            self._subscribers[migration_id].discard(queue)
            if not self._subscribers[migration_id]:
                del self._subscribers[migration_id]
        self._global_subscribers.discard(queue)

    async def broadcast(self, event_type: str, data: Dict, migration_id: Optional[str] = None):
        payload = {
            "event_type": event_type,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "migration_id": migration_id,
            "data": data,
        }

        # Send to specific migration subscribers
        targets: List[asyncio.Queue] = []
        if migration_id and migration_id in self._subscribers:
            targets.extend(list(self._subscribers[migration_id]))
        targets.extend(list(self._global_subscribers))

        for queue in targets:
            try:
                queue.put_nowait(payload)
            except asyncio.QueueFull:
                pass  # Drop oldest or skip if consumer is lagging

event_broadcaster = EventBroadcaster()
