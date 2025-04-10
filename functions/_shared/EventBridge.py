import json
import logging
from _shared.DecimalEncoder import DecimalEncoder

def triggerEBEvent(eventBridgeClient, source = "core", detail_type = "General", detail = {}):
    logger = logging.getLogger()
    logger.info(f"Trigger Event Bus: \n{source} \n {detail_type} \n {detail}")
    eventBridgeClient.put_events(
        Entries=[
            {
                # 'Detail': '{ "message": "Hello, EventBridge!" }',
                'Detail': json.dumps(detail, cls=DecimalEncoder),
                'DetailType': detail_type,
                'Source': f"dance-engine.{source}",
            },
        ]
    )
    return True