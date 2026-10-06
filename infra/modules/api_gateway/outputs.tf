output "api_endpoint" {
  description = "Base URL the mobile app calls."
  value       = aws_apigatewayv2_api.main.api_endpoint
}

output "custom_domain_url" {
  description = "The real, user-facing API URL — only resolves once the api.<domain> CNAME record is added in Namecheap pointing at custom_domain_target below."
  value       = "https://${aws_apigatewayv2_domain_name.api.domain_name}"
}

output "custom_domain_target" {
  description = "Value to point api.<domain_name>'s CNAME record at in Namecheap — the API Gateway regional custom domain's own target, not the raw execute-api endpoint."
  value       = aws_apigatewayv2_domain_name.api.domain_name_configuration[0].target_domain_name
}
