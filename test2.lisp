(
let ((x (
	compose
		(map (lambda (x) (add 3 x)))
		(map (lambda (x) (add 1 x)))
))) (print (x (1 2 3)))
)