# Repair the broken error and retry path

## Repair the broken error and retry path

CheckpointFailure Handling·8 min

 

### Repair the broken error and retry path

 

The block below has one defect. Identify it and write the corrected version.

 

Broken code shown to the learner

 

def call_with_retry(make_call, max_attempts=5): for attempt in range(max_attempts): try: return make_call() except Exception: time.sleep(0) raise RetryBudgetExhausted()
