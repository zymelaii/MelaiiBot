#include <stdio.h>
#include <float.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>

float target;

struct Element
{
	float *data;
	size_t size;
	char str[64];
	int id;

	void set(const char *s)
	{
		strcpy(str, s);
	}
};

void p2(Element *_ae)
{
#define P(OP, L, R) do {                             \
float a = _ae[L].data[_ae[L].id];                    \
float b = _ae[R].data[_ae[R].id];                    \
if (fabs((a OP b) - target) < FLT_EPSILON)           \
	printf("%s" #OP "%s\n", _ae[L].str, _ae[R].str); \
} while (0);

	P(+, 0, 1);
	P(-, 0, 1);
	P(-, 1, 0);
	P(*, 0, 1);
	P(/, 0, 1);
	P(/, 1, 0);

#undef P
}

void p3(Element *_ae)
{
	float in[2];
	Element ae[2];
	char buf[256];

	for (int i = 0; i < 2; ++i)
	{
		ae[i].data = in;
		ae[i].size = 2;
		ae[i].id = i;
	}

#define P(OP, L, R, V2)                                \
sprintf(buf, "(%s" #OP "%s)", _ae[L].str, _ae[R].str); \
{                                                      \
    float a = _ae[L].data[_ae[L].id];                  \
    float b = _ae[R].data[_ae[R].id];                  \
	in[0] = a OP b;                                    \
}                                                      \
ae[0].set(buf);                                        \
in[1] = _ae[V2].data[_ae[V2].id];                      \
ae[1].set(_ae[V2].str);                                \
p2(ae);

	P(+, 0, 1, 2);
	P(+, 0, 2, 1);
	P(+, 1, 2, 0);

	P(-, 0, 1, 2);
	P(-, 0, 2, 1);
	P(-, 1, 2, 0);

	P(-, 1, 0, 2);
	P(-, 2, 0, 1);
	P(-, 2, 1, 0);

	P(*, 0, 1, 2);
	P(*, 0, 2, 1);
	P(*, 1, 2, 0);

	P(/, 0, 1, 2);
	P(/, 0, 2, 1);
	P(/, 1, 2, 0);

	P(/, 1, 0, 2);
	P(/, 2, 0, 1);
	P(/, 2, 1, 0);

#undef P
}

void p4(Element *_ae)
{
	float in[3];
	Element ae[3];
	char buf[256];

	for (int i = 0; i < 3; ++i)
	{
		ae[i].data = in;
		ae[i].size = 3;
		ae[i].id = i;
	}

#define P(OP, L, R, V2, V3)                            \
sprintf(buf, "(%s" #OP "%s)", _ae[L].str, _ae[R].str); \
{                                                      \
    float a = _ae[L].data[_ae[L].id];                  \
    float b = _ae[R].data[_ae[R].id];                  \
	in[0] = a OP b;                                    \
}                                                      \
ae[0].set(buf);                                        \
in[1] = _ae[V2].data[_ae[V2].id];                      \
ae[1].set(_ae[V2].str);                                \
in[2] = _ae[V3].data[_ae[V3].id];                      \
ae[2].set(_ae[V3].str);                                \
p3(ae);

	P(+, 0, 1, 2, 3);
	P(+, 0, 2, 1, 3);
	P(+, 0, 3, 1, 2);
	P(+, 1, 2, 0, 3);
	P(+, 1, 3, 0, 2);
	P(+, 2, 3, 0, 1);

	P(-, 0, 1, 2, 3);
	P(-, 0, 2, 1, 3);
	P(-, 0, 3, 1, 2);
	P(-, 1, 2, 0, 3);
	P(-, 1, 3, 0, 2);
	P(-, 2, 3, 0, 1);

	P(-, 1, 0, 2, 3);
	P(-, 2, 0, 1, 3);
	P(-, 3, 0, 1, 2);
	P(-, 2, 1, 0, 3);
	P(-, 3, 1, 0, 2);
	P(-, 3, 2, 0, 1);

	P(*, 0, 1, 2, 3);
	P(*, 0, 2, 1, 3);
	P(*, 0, 3, 1, 2);
	P(*, 1, 2, 0, 3);
	P(*, 1, 3, 0, 2);
	P(*, 2, 3, 0, 1);

	P(/, 0, 1, 2, 3);
	P(/, 0, 2, 1, 3);
	P(/, 0, 3, 1, 2);
	P(/, 1, 2, 0, 3);
	P(/, 1, 3, 0, 2);
	P(/, 2, 3, 0, 1);

	P(/, 1, 0, 2, 3);
	P(/, 2, 0, 1, 3);
	P(/, 3, 0, 1, 2);
	P(/, 2, 1, 0, 3);
	P(/, 3, 1, 0, 2);
	P(/, 3, 2, 0, 1);

#undef P
}

int main(int argc, char const *argv[])
{
	if (argc != 6) return 1;

	//! INPUT: EXEC NUM1 NUM2 NUM3 NUM4 TARGET

	float in[4];
	in[0] = atof(argv[1]);
	in[1] = atof(argv[2]);
	in[2] = atof(argv[3]);
	in[3] = atof(argv[4]);

	target = atof(argv[5]);

	Element ae[4];
	for (int i = 0; i < 4; ++i)
	{
		ae[i].data = in;
		ae[i].size = 4;
		ae[i].set(argv[i + 1]);
		ae[i].id = i;
	}

	p4(ae);

	return 0;
}