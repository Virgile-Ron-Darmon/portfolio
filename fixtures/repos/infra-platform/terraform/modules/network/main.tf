resource "aws_vpc" "this" {
  cidr_block           = var.cidr_block
  enable_dns_hostnames = true
  tags                 = { Name = "prod" }
}

resource "aws_subnet" "private" {
  for_each          = toset(var.azs)
  vpc_id            = aws_vpc.this.id
  availability_zone = each.value
  cidr_block        = cidrsubnet(var.cidr_block, 4, index(var.azs, each.value))
}

resource "aws_subnet" "nat" {
  vpc_id     = aws_vpc.this.id
  cidr_block = cidrsubnet(var.cidr_block, 8, 250)
}

output "private_subnet_ids" {
  value = [for s in aws_subnet.private : s.id]
}
