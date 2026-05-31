output "vpc_id" {
  value = aws_vpc.main.id
}

output "private_subnets" {
  value = [aws_subnet.private_1.id, aws_subnet.private_2.id]
}

output "public_subnets" {
  value = [aws_subnet.public_1.id, aws_subnet.public_2.id]
}

output "nat_gateway_ids" {
  value = [aws_nat_gateway.nat_1.id, aws_nat_gateway.nat_2.id]
}
