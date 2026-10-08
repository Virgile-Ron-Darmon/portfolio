TF := terraform -chdir=terraform

init:
	$(TF) init

plan:
	$(TF) plan -out=plan.out

apply:
	$(TF) apply plan.out

.PHONY: init plan apply
