# Tables mirror docs/10-build-plan.md §2's data model. All on-demand
# billing (PAY_PER_REQUEST) — traffic is unknown at beta stage, so paying
# per-request beats guessing at provisioned capacity.
#
# Two GSIs go beyond that doc's entity list, both needed by the
# notification Lambdas in the api_lambdas module (docs/10-build-plan.md
# §5's reminder + nudge notifications):
#   - batches.BatchIdIndex: a schedule/log item only carries batchId, not
#     farmId, so finding which farm (and phone number) owns a batch needs
#     a batchId-only lookup — the base table's key is farmId+batchId.
#   - vaccination_schedules.StatusDueDateIndex: lets the reminder Lambda
#     ask "what's upcoming and due soon" directly instead of scanning
#     every batch's schedule.

resource "aws_dynamodb_table" "farms" {
  name         = "${var.project_name}-${var.environment}-farms"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "farmId"

  attribute {
    name = "farmId"
    type = "S"
  }
}

resource "aws_dynamodb_table" "batches" {
  name         = "${var.project_name}-${var.environment}-batches"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "farmId"
  range_key    = "batchId"

  attribute {
    name = "farmId"
    type = "S"
  }
  attribute {
    name = "batchId"
    type = "S"
  }

  global_secondary_index {
    name            = "BatchIdIndex"
    hash_key        = "batchId"
    projection_type = "ALL"
  }
}

resource "aws_dynamodb_table" "users" {
  name         = "${var.project_name}-${var.environment}-users"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "userId"

  attribute {
    name = "userId"
    type = "S"
  }
}

resource "aws_dynamodb_table" "mortality_logs" {
  name         = "${var.project_name}-${var.environment}-mortality-logs"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "batchId"
  range_key    = "entryId"

  attribute {
    name = "batchId"
    type = "S"
  }
  attribute {
    name = "entryId"
    type = "S"
  }
}

resource "aws_dynamodb_table" "feed_logs" {
  name         = "${var.project_name}-${var.environment}-feed-logs"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "batchId"
  range_key    = "entryId"

  attribute {
    name = "batchId"
    type = "S"
  }
  attribute {
    name = "entryId"
    type = "S"
  }
}

resource "aws_dynamodb_table" "egg_logs" {
  name         = "${var.project_name}-${var.environment}-egg-logs"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "batchId"
  range_key    = "entryId"

  attribute {
    name = "batchId"
    type = "S"
  }
  attribute {
    name = "entryId"
    type = "S"
  }
}

resource "aws_dynamodb_table" "weight_logs" {
  name         = "${var.project_name}-${var.environment}-weight-logs"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "batchId"
  range_key    = "entryId"

  attribute {
    name = "batchId"
    type = "S"
  }
  attribute {
    name = "entryId"
    type = "S"
  }
}

resource "aws_dynamodb_table" "vaccination_records" {
  name         = "${var.project_name}-${var.environment}-vaccination-records"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "batchId"
  range_key    = "entryId"

  attribute {
    name = "batchId"
    type = "S"
  }
  attribute {
    name = "entryId"
    type = "S"
  }
}

resource "aws_dynamodb_table" "vaccination_schedules" {
  name         = "${var.project_name}-${var.environment}-vaccination-schedules"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "batchId"
  range_key    = "scheduleId"

  attribute {
    name = "batchId"
    type = "S"
  }
  attribute {
    name = "scheduleId"
    type = "S"
  }
  attribute {
    name = "status"
    type = "S"
  }
  attribute {
    name = "dueDate"
    type = "S"
  }

  global_secondary_index {
    name            = "StatusDueDateIndex"
    hash_key        = "status"
    range_key       = "dueDate"
    projection_type = "ALL"
  }
}

# Farm-level feed purchases ("received" side of feed stock) — not in
# docs/10-build-plan.md's original data model, added to back
# frontend-react's already-built feed-stock UI. See
# backend/src/lib/types.ts's FeedPurchase for the full reasoning.
resource "aws_dynamodb_table" "feed_purchases" {
  name         = "${var.project_name}-${var.environment}-feed-purchases"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "farmId"
  range_key    = "entryId"

  attribute {
    name = "farmId"
    type = "S"
  }
  attribute {
    name = "entryId"
    type = "S"
  }
}
