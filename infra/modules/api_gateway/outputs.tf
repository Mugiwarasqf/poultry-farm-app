output "api_endpoint" {
  description = "Base URL the mobile app calls."
  value       = aws_apigatewayv2_api.main.api_endpoint
}
