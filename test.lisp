(
let ((x (
	(compose
		(filter (lambda (x) (gt 5 x)))
		(map (lambda (x) (add 1 x)))
		(map (lambda (x) (add 1 x)))
	)
	(1 2 3)
)) (y 4)) (print x)
)