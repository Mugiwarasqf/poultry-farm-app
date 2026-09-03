output "define_challenge_arn" {
  value = aws_lambda_function.define_challenge.arn
}
output "define_challenge_name" {
  value = aws_lambda_function.define_challenge.function_name
}

output "create_challenge_arn" {
  value = aws_lambda_function.create_challenge.arn
}
output "create_challenge_name" {
  value = aws_lambda_function.create_challenge.function_name
}

output "verify_challenge_arn" {
  value = aws_lambda_function.verify_challenge.arn
}
output "verify_challenge_name" {
  value = aws_lambda_function.verify_challenge.function_name
}
