output "github_actions_role_arn" {
  description = "Set as AWS_ROLE_ARN in the repo's GitHub Actions secrets/vars."
  value       = aws_iam_role.github_actions.arn
}
