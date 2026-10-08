terraform {
  required_version = ">= 1.6"

  backend "s3" {
    bucket         = "infra-state"
    key            = "prod/terraform.tfstate"
    region         = "eu-west-2"
    dynamodb_table = "infra-locks"
    encrypt        = true
  }
}

module "network" {
  source     = "./modules/network"
  cidr_block = var.cidr_block
  azs        = var.availability_zones
}

module "compute" {
  source     = "./modules/compute"
  subnet_ids = module.network.private_subnet_ids
  node_count = var.node_count
  node_size  = var.node_size
}

output "node_ips" {
  description = "Private IPs of every node, consumed by the Ansible inventory."
  value       = module.compute.private_ips
}
