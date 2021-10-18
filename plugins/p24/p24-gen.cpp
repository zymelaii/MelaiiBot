#include <stdio.h>
#include <float.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <time.h>
#include <random>
#include <chrono>

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

bool p2(Element *_ae)
{
#define P(OP, L, R) do {                             \
float a = _ae[L].data[_ae[L].id];                    \
float b = _ae[R].data[_ae[R].id];                    \
if (fabs((a OP b) - target) < FLT_EPSILON)           \
	return true;                                     \
} while (0);

	P(+, 0, 1);
	P(-, 0, 1);
	P(-, 1, 0);
	P(*, 0, 1);
	P(/, 0, 1);
	P(/, 1, 0);

#undef P

	return false;
}

bool p3(Element *_ae)
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
if (p2(ae)) return true;

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

	return false;
}

bool p4(Element *_ae)
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
if (p3(ae)) return true;

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

	return false;
}

bool hascommon(int x, int y)
{
	if (x < y)
	{
		int z = x;
		x = y;
		y = z;
	}

	while (y > 1)
	{
		if (x % y == 0) return true;
		int z = x % y;
		x = y;
		y = z;
	}

	return false;
}

int* gencommons(int target, int *size)
{	//! compute all numbers that have common factor
	int *buffer = (int*)malloc(target * sizeof(int));
	memset(buffer, 0, target * sizeof(int));
	const int bound = (int)sqrt(target);

	int i = 1, j = 0;

	for (; i <= bound; ++i)
	{
		if (target % i == 0)
		{
			buffer[j++] = i;
		}
	}

	for (; i < target; ++i)
	{
		if (hascommon(target, i))
		{
			buffer[j++] = i;
		}
	}

	buffer[j] = target;

	*size = j;
	return buffer;
}

int timestamp()
{
	using namespace std;
	using namespace std::chrono;
	auto c_time = duration_cast<milliseconds>(system_clock::now().time_since_epoch());
    return c_time.count();
}

int main(int argc, char const *argv[])
{
	if (argc != 2) return 1;

	//! INPUT: EXEC NUM1 NUM2 NUM3 NUM4 TARGET

	target = atof(argv[1]);

	int *buffer, size;
	buffer = gencommons((int)target, &size);

	Element ae[4];
	char buf[256];
	float in[4];

	std::default_random_engine e(timestamp());
	std::uniform_int_distribution<int> u(0, size - 1);

	int iter = 1024;
	while (iter--)
	{
		for (int i = 0; i < 4; ++i)
		{
			int flusheN = u(e) % 256;
			for (int j = 0; j < flusheN; ++j, u(e));

			in[i] = buffer[u(e)];
			sprintf(buf, "%d", (int)in[i]);

			ae[i].data = in;
			ae[i].size = 4;
			ae[i].set(buf);
			ae[i].id = i;
		}

		if (p4(ae))
		{
			printf("%s %s %s %s",
				ae[0].str,
				ae[1].str,
				ae[2].str,
				ae[3].str);
			break;
		}
	}

	free(buffer);

	return 0;
}