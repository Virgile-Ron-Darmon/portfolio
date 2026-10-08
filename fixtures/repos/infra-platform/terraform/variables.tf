variable "cidr_block" {
  type        = string
  description = "Address space for the whole environment."
  default     = "10.40.0.0/16"
}

variable "availability_zones" {
  type    = list(string)
  default = ["eu-west-2a", "eu-west-2b"]
}

variable "node_count" {
  type    = number
  default = 3

  validation {
    condition     = var.node_count >= 3
    error_message = "Keep at least three nodes so a single failure never loses quorum."
  }
}

variable "node_size" {
  type    = string
  default = "t3.medium"
}
